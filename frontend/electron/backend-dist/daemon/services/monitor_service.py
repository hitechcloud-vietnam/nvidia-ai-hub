from __future__ import annotations
import asyncio
import json
import platform
import re
import shutil
import socket
import subprocess
import time
from pathlib import Path

import psutil

from daemon.config import settings
from daemon.models.container import (
    DeploymentPlan,
    DeploymentProfileRecommendation,
    DeploymentSelection,
    GpuMetrics,
    GpuTopologyLink,
    GpuTopologyRow,
    GpuTopologySnapshot,
    RecipeMetrics,
    SystemMetrics,
)
from daemon.models.recipe import Recipe
from daemon.services.registry_service import get_recipes


def _round_gb(value: float) -> float:
    return round(value / (1024**3), 1)


def _safe_int(value) -> int:
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return 0


def _safe_float(value) -> float:
    try:
        return round(float(value), 1)
    except (ValueError, TypeError):
        return 0.0


def _version_tuple(raw: str) -> tuple[int, ...]:
    parts = re.findall(r"\d+", str(raw or ""))
    if not parts:
        return ()
    return tuple(int(part) for part in parts)


async def _run_command(*args: str, timeout_seconds: float = 5.0) -> str:
    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            proc.kill()
            stdout, _ = await proc.communicate()
        if proc.returncode not in (0, -9, 1):
            return ""
        return stdout.decode(errors="replace").strip()
    except NotImplementedError:
        try:
            completed = await asyncio.to_thread(
                subprocess.run,
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                timeout=timeout_seconds,
            )
            if completed.returncode not in (0, -9, 1):
                return ""
            return completed.stdout.decode(errors="replace").strip()
        except Exception:
            return ""
    except Exception:
        return ""


def _safe_float_str(value: str) -> float:
    try:
        return round(float(str(value).strip()), 2)
    except (ValueError, TypeError):
        return 0.0


def _safe_int_str(value: str) -> int:
    try:
        return int(float(str(value).strip()))
    except (ValueError, TypeError):
        return 0


async def _get_container_pids(container_name: str) -> set[int]:
    output = await _run_command("docker", "top", container_name, "-eo", "pid", timeout_seconds=4.0)
    if not output:
        return set()

    pids: set[int] = set()
    for line in output.splitlines():
        text = line.strip()
        if not text or text.lower() == "pid" or text.startswith("PID"):
            continue
        token = text.split()[0]
        if token.isdigit():
            pids.add(int(token))
    return pids


async def _collect_nvidia_process_metrics(gpu_index_by_uuid: dict[str, int]) -> dict[int, dict[str, object]]:
    if not shutil.which("nvidia-smi"):
        return {}

    snapshot: dict[int, dict[str, object]] = {}

    pmon_output = await _run_command("nvidia-smi", "pmon", "-c", "1", "-s", "um", timeout_seconds=5.0)
    if pmon_output:
        for raw_line in pmon_output.splitlines():
            text = raw_line.strip()
            if not text or text.startswith("#"):
                continue
            parts = text.split()
            if len(parts) < 5 or not parts[1].isdigit():
                continue

            gpu_index = _safe_int(parts[0])
            pid = int(parts[1])
            sm_util = max(0, _safe_int(parts[3]))
            mem_util = max(0, _safe_int(parts[4]))

            record = snapshot.setdefault(
                pid,
                {
                    "gpu_indices": set(),
                    "util_by_gpu": {},
                    "mem_util_by_gpu": {},
                    "gpu_memory_used_mb": 0,
                },
            )
            record["gpu_indices"].add(gpu_index)
            record["util_by_gpu"][gpu_index] = max(record["util_by_gpu"].get(gpu_index, 0), sm_util)
            record["mem_util_by_gpu"][gpu_index] = max(record["mem_util_by_gpu"].get(gpu_index, 0), mem_util)

    compute_output = await _run_command(
        "nvidia-smi",
        "--query-compute-apps=pid,gpu_uuid,used_gpu_memory",
        "--format=csv,noheader,nounits",
        timeout_seconds=5.0,
    )
    if compute_output:
        for raw_line in compute_output.splitlines():
            if not raw_line.strip():
                continue
            parts = [part.strip() for part in raw_line.split(",", maxsplit=2)]
            if len(parts) < 3:
                continue

            pid = _safe_int(parts[0])
            if pid <= 0:
                continue
            gpu_index = gpu_index_by_uuid.get(parts[1])
            used_mb = _safe_int(parts[2])

            record = snapshot.setdefault(
                pid,
                {
                    "gpu_indices": set(),
                    "util_by_gpu": {},
                    "mem_util_by_gpu": {},
                    "gpu_memory_used_mb": 0,
                },
            )
            if gpu_index is not None:
                record["gpu_indices"].add(gpu_index)
            record["gpu_memory_used_mb"] = int(record["gpu_memory_used_mb"]) + max(0, used_mb)

    return snapshot


async def _apply_nvidia_recipe_gpu_metrics(
    per_recipe: dict[str, RecipeMetrics],
    container_names_by_slug: dict[str, list[str]],
    system_metrics: SystemMetrics,
) -> set[str]:
    gpu_index_by_uuid = {gpu.uuid: gpu.index for gpu in system_metrics.gpus if gpu.uuid}
    process_snapshot = await _collect_nvidia_process_metrics(gpu_index_by_uuid)
    if not process_snapshot:
        return set()

    gpu_by_index = {gpu.index: gpu for gpu in system_metrics.gpus}
    attributed: set[str] = set()

    for slug, container_names in container_names_by_slug.items():
        recipe_metrics = per_recipe.get(slug)
        if not recipe_metrics:
            continue

        container_pids: set[int] = set()
        for container_name in container_names:
            container_pids.update(await _get_container_pids(container_name))

        if not container_pids:
            continue

        util_by_gpu: dict[int, int] = {}
        touched_gpu_indices: set[int] = set()
        gpu_memory_used_mb = 0

        for pid in container_pids:
            record = process_snapshot.get(pid)
            if not record:
                continue

            gpu_indices = record.get("gpu_indices", set())
            touched_gpu_indices.update(gpu_indices)
            for gpu_index, util in record.get("util_by_gpu", {}).items():
                util_by_gpu[gpu_index] = min(100, util_by_gpu.get(gpu_index, 0) + _safe_int(util))
            gpu_memory_used_mb += _safe_int(record.get("gpu_memory_used_mb", 0))

        if not touched_gpu_indices and gpu_memory_used_mb <= 0:
            continue

        touched_gpus = [gpu_by_index[index] for index in sorted(touched_gpu_indices) if index in gpu_by_index]
        if touched_gpus:
            recipe_metrics.gpu_name = touched_gpus[0].name if len(touched_gpus) == 1 else f"{len(touched_gpus)} GPUs"
            recipe_metrics.gpu_memory_total_mb = sum(gpu.memory_total_mb for gpu in touched_gpus)
            recipe_metrics.temperature = max((gpu.temperature for gpu in touched_gpus), default=recipe_metrics.temperature)
            recipe_metrics.temperature_source = "nvidia-smi"

        recipe_metrics.gpu_utilization = max(util_by_gpu.values(), default=recipe_metrics.gpu_utilization)
        recipe_metrics.gpu_memory_used_mb = gpu_memory_used_mb or recipe_metrics.gpu_memory_used_mb
        recipe_metrics.telemetry_source = "docker-stats + nvidia-smi pmon"
        attributed.add(slug)

    return attributed


async def get_recipe_metrics() -> dict[str, RecipeMetrics]:
    output = await _run_command(
        "docker",
        "stats",
        "--no-stream",
        "--format",
        "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}",
        timeout_seconds=8.0,
    )
    if not output:
        return {}

    per_recipe: dict[str, RecipeMetrics] = {}
    container_names_by_slug: dict[str, list[str]] = {}
    now = int(time.time())
    known_projects = {
        f"nvidia-ai-hub-{slug}": slug
        for slug in get_recipes().keys()
    }
    ordered_projects = sorted(known_projects.items(), key=lambda item: len(item[0]), reverse=True)

    for raw_line in output.splitlines():
        if not raw_line.strip():
            continue
        parts = raw_line.split("\t")
        if len(parts) < 3:
            continue

        name = parts[0].strip()
        cpu_percent = _safe_float_str(parts[1].replace("%", ""))
        mem_usage = parts[2].strip()

        slug = ""
        for project, candidate_slug in ordered_projects:
            if name == project or name.startswith(f"{project}-"):
                slug = candidate_slug
                break
        if not slug:
            continue

        container_names_by_slug.setdefault(slug, []).append(name)

        used_mb = 0.0
        limit_mb = 0.0
        if "/" in mem_usage:
            used_raw, limit_raw = [segment.strip() for segment in mem_usage.split("/", 1)]
            used_mb = _to_mb(used_raw)
            limit_mb = _to_mb(limit_raw)

        entry = per_recipe.get(slug)
        if not entry:
            entry = RecipeMetrics(slug=slug, running=True, telemetry_source="docker-stats", updated_at=now)
            per_recipe[slug] = entry

        entry.container_count += 1
        entry.cpu_percent = round(entry.cpu_percent + cpu_percent, 1)
        entry.memory_used_mb = round(entry.memory_used_mb + used_mb, 1)
        entry.memory_limit_mb = round(entry.memory_limit_mb + limit_mb, 1)

    system_metrics = await get_system_metrics()
    attributed_gpu_slugs = await _apply_nvidia_recipe_gpu_metrics(per_recipe, container_names_by_slug, system_metrics)
    for entry in per_recipe.values():
        if entry.memory_limit_mb > 0:
            entry.memory_percent = round((entry.memory_used_mb / entry.memory_limit_mb) * 100, 1)
        if entry.slug not in attributed_gpu_slugs:
            entry.gpu_name = system_metrics.gpu_name
            entry.gpu_utilization = system_metrics.gpu_utilization
            entry.gpu_memory_used_mb = system_metrics.gpu_memory_used_mb
            entry.gpu_memory_total_mb = system_metrics.gpu_memory_total_mb
            entry.temperature = system_metrics.gpu_temperature or system_metrics.cpu_temperature
            entry.temperature_source = system_metrics.gpu_temperature_source or system_metrics.cpu_temperature_source
            entry.telemetry_source = "docker-stats + host gpu"

    return per_recipe


def _to_mb(value: str) -> float:
    text = str(value or "").strip().upper()
    match = re.match(r"^([0-9]+(?:\.[0-9]+)?)\s*([KMGTP]?I?B)$", text)
    if not match:
        return 0.0

    amount = float(match.group(1))
    unit = match.group(2)
    factors = {
        "KIB": 1 / 1024,
        "MIB": 1,
        "GIB": 1024,
        "TIB": 1024 * 1024,
        "KB": 1 / 1000,
        "MB": 1,
        "GB": 1000,
        "TB": 1000 * 1000,
        "B": 1 / (1024 * 1024),
    }
    return round(amount * factors.get(unit, 0.0), 1)


def _parse_numeric(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return 0.0
    match = re.search(r"-?\d+(?:\.\d+)?", str(value))
    if not match:
        return 0.0
    try:
        return float(match.group(0))
    except ValueError:
        return 0.0


def _collect_leaf_values(node, path: list[str] | None = None) -> list[tuple[str, object]]:
    path = path or []
    leaves: list[tuple[str, object]] = []
    if isinstance(node, dict):
        for key, value in node.items():
            leaves.extend(_collect_leaf_values(value, path + [str(key)]))
    elif isinstance(node, list):
        for index, value in enumerate(node):
            leaves.extend(_collect_leaf_values(value, path + [str(index)]))
    else:
        leaves.append((":".join(path), node))
    return leaves


def _pick_leaf_value(leaves: list[tuple[str, object]], fragments: tuple[str, ...]) -> object | None:
    lowered = tuple(fragment.lower() for fragment in fragments)
    for path, value in leaves:
        path_lower = path.lower()
        if all(fragment in path_lower for fragment in lowered):
            return value
    for path, value in leaves:
        path_lower = path.lower()
        if any(fragment in path_lower for fragment in lowered):
            return value
    return None


def _decode_json_objects(raw: str) -> list[object]:
    decoder = json.JSONDecoder()
    objects: list[object] = []
    index = 0
    while index < len(raw):
        next_start = raw.find("{", index)
        if next_start == -1:
            break
        try:
            parsed, end = decoder.raw_decode(raw[next_start:])
            objects.append(parsed)
            index = next_start + end
        except json.JSONDecodeError:
            index = next_start + 1
    return objects


def _temperature_from_psutil() -> tuple[float, str]:
    try:
        temps = psutil.sensors_temperatures(fahrenheit=False)
    except Exception:
        return 0.0, ""

    if not temps:
        return 0.0, ""

    preferred = [
        'coretemp',
        'k10temp',
        'cpu_thermal',
        'acpitz',
        'zenpower',
    ]
    entries = []
    source = ""
    for key in preferred:
        group = temps.get(key, [])
        if group:
            entries.extend(group)
            source = f"psutil:{key}"
    if not entries:
        for key, group in temps.items():
            entries.extend(group)
            if group and not source:
                source = f"psutil:{key}"

    current_values = [float(entry.current) for entry in entries if getattr(entry, 'current', None) is not None]
    if not current_values:
        return 0.0, ""
    return round(max(current_values), 1), source


def _temperature_from_linux_thermal_zone() -> tuple[float, str]:
    zone_root = Path("/sys/class/thermal")
    if not zone_root.exists():
        return 0.0, ""

    preferred_terms = ("cpu", "package", "x86_pkg_temp", "soc", "tdie", "tctl")
    fallback_values: list[tuple[float, str]] = []
    preferred_values: list[tuple[float, str]] = []

    for temp_file in zone_root.glob("thermal_zone*/temp"):
        try:
            raw = temp_file.read_text(encoding="utf-8").strip()
            temp_value = float(raw)
            if temp_value > 1000:
                temp_value = temp_value / 1000.0
            if temp_value <= 0:
                continue

            zone_type_file = temp_file.parent / "type"
            zone_type = zone_type_file.read_text(encoding="utf-8").strip() if zone_type_file.exists() else temp_file.parent.name
            entry = (round(temp_value, 1), zone_type)
            fallback_values.append(entry)
            if any(term in zone_type.lower() for term in preferred_terms):
                preferred_values.append(entry)
        except Exception:
            continue

    values = preferred_values or fallback_values
    if not values:
        return 0.0, ""

    best = max(values, key=lambda item: item[0])
    return best[0], f"thermal_zone:{best[1]}"


async def _temperature_from_linux_sensors() -> tuple[float, str]:
    if not shutil.which("sensors"):
        return 0.0, ""

    output = await _run_command("sensors", "-j")
    if not output:
        return 0.0, ""

    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        return 0.0, ""

    candidates: list[tuple[float, str]] = []

    def walk(node, path: list[str]):
        if isinstance(node, dict):
            for key, value in node.items():
                key_lower = key.lower()
                if isinstance(value, (int, float)) and (
                    key_lower.endswith("_input") or key_lower.endswith("_max") or "temp" in key_lower
                ):
                    numeric = float(value)
                    if 0 < numeric < 150:
                        candidates.append((round(numeric, 1), ":".join(path + [key])))
                else:
                    walk(value, path + [key])
        elif isinstance(node, list):
            for index, item in enumerate(node):
                walk(item, path + [str(index)])

    walk(data, [])
    if not candidates:
        return 0.0, ""

    preferred_terms = ("package", "tdie", "tctl", "core", "cpu")
    preferred = [item for item in candidates if any(term in item[1].lower() for term in preferred_terms)]
    best = max(preferred or candidates, key=lambda item: item[0])
    return best[0], f"sensors:{best[1]}"


async def _resolve_cpu_temperature() -> tuple[float, str]:
    temp, source = _temperature_from_psutil()
    if temp > 0:
        return temp, source

    if platform.system() == "Linux":
        temp, source = await _temperature_from_linux_sensors()
        if temp > 0:
            return temp, source

        temp, source = _temperature_from_linux_thermal_zone()
        if temp > 0:
            return temp, source

    return 0.0, ""


def _apply_gpu_summary(metrics: SystemMetrics):
    metrics.gpu_count = len(metrics.gpus)
    if not metrics.gpus:
        return

    metrics.gpu_name = metrics.gpus[0].name if len(metrics.gpus) == 1 else f"{len(metrics.gpus)} GPUs"
    compute_caps = [gpu.compute_capability for gpu in metrics.gpus if gpu.compute_capability]
    if compute_caps:
        metrics.gpu_compute_capability = max(compute_caps, key=_version_tuple)
    metrics.gpu_utilization = max((gpu.utilization for gpu in metrics.gpus), default=0)
    metrics.gpu_memory_used_mb = sum(gpu.memory_used_mb for gpu in metrics.gpus)
    metrics.gpu_memory_total_mb = sum(gpu.memory_total_mb for gpu in metrics.gpus)
    metrics.gpu_temperature = max((gpu.temperature for gpu in metrics.gpus), default=0.0)


def _classify_topology_link(raw_value: str) -> str:
    value = str(raw_value or "").strip().upper()
    if not value or value == "X":
        return "self"
    if value.startswith("NV"):
        return "nvlink"
    if value in {"PIX", "PXB", "PHB"}:
        return "pcie"
    if value in {"SOC", "NODE", "SYS"}:
        return "system"
    return "unknown"


def _cluster_hosts_path() -> Path:
    return settings.cluster_path / "hosts.json"


def _cluster_shared_storage_path() -> Path:
    return settings.cluster_path / "shared-storage.txt"


async def get_gpu_topology_snapshot(metrics: SystemMetrics | None = None) -> GpuTopologySnapshot:
    snapshot = GpuTopologySnapshot()
    system_metrics = metrics or await get_system_metrics()
    snapshot.multi_gpu = len(system_metrics.gpus) > 1

    if len(system_metrics.gpus) < 2:
        snapshot.notes.append("Topology details are only available when at least two GPUs are detected.")
        return snapshot

    if not shutil.which("nvidia-smi"):
        snapshot.notes.append("`nvidia-smi` is unavailable on this host, so NVIDIA topology data could not be collected.")
        return snapshot

    output = await _run_command("nvidia-smi", "topo", "-m", timeout_seconds=5.0)
    if not output:
        snapshot.notes.append("`nvidia-smi topo -m` returned no topology matrix.")
        return snapshot

    lines = [line.rstrip() for line in output.splitlines() if line.strip()]
    header: list[str] = []
    rows: list[GpuTopologyRow] = []

    for raw_line in lines:
        stripped = raw_line.strip()
        if stripped.startswith("GPU") and not header:
            parts = stripped.split()
            header = [part for part in parts if re.fullmatch(r"GPU\d+", part)]
            continue

        if not re.match(r"^GPU\d+\s+", stripped):
            continue

        parts = stripped.split()
        row_label = parts[0]
        row_index = _safe_int(row_label.replace("GPU", ""))
        gpu_links = parts[1:1 + len(header)] if header else []
        links: list[GpuTopologyLink] = []

        for column, target_label in enumerate(header):
            link_value = gpu_links[column] if column < len(gpu_links) else ""
            target_index = _safe_int(target_label.replace("GPU", ""))
            link_class = _classify_topology_link(link_value)
            if row_index == target_index:
                continue
            links.append(
                GpuTopologyLink(
                    target_index=target_index,
                    target_label=target_label,
                    link_type=link_value,
                    bandwidth_class=link_class,
                )
            )

        rows.append(GpuTopologyRow(gpu_index=row_index, gpu_label=row_label, links=links))

    if rows:
        snapshot.detected = True
        snapshot.source = "nvidia-smi topo -m"
        snapshot.rows = rows
        snapshot.nvlink_pairs = sum(
            1
            for row in rows
            for link in row.links
            if link.bandwidth_class == "nvlink" and row.gpu_index < link.target_index
        )
        snapshot.peer_to_peer_capable = any(
            link.bandwidth_class in {"nvlink", "pcie"}
            for row in rows
            for link in row.links
        )
    else:
        snapshot.notes.append("GPU telemetry is available, but no parsable topology matrix was returned.")

    return snapshot


def _build_recommendations(
    recipe: Recipe,
    metrics: SystemMetrics,
    topology: GpuTopologySnapshot,
    selected: DeploymentSelection,
    shared_storage_ready: bool,
    network_ready: bool,
) -> list[DeploymentProfileRecommendation]:
    gpu_indices = [gpu.index for gpu in metrics.gpus]
    needs_gpu = bool(recipe.docker.gpu)
    multi_gpu_supported = len(gpu_indices) >= 2
    cluster_supported = multi_gpu_supported and shared_storage_ready and network_ready

    return [
        DeploymentProfileRecommendation(
            profile="single-gpu",
            label="Single GPU",
            supported=(not needs_gpu) or len(gpu_indices) >= 1,
            recommended=(selected.profile == "single-gpu") or len(gpu_indices) <= 1,
            rationale="Use one local GPU for workstation or single-user deployment.",
            strategy="local-ui",
            gpu_count=1 if gpu_indices else 0,
            target_gpu_indices=gpu_indices[:1],
            caveats=[] if gpu_indices else ["No local GPU telemetry is available for this recipe."],
        ),
        DeploymentProfileRecommendation(
            profile="multi-gpu",
            label="Multi-GPU",
            supported=(not needs_gpu) or multi_gpu_supported,
            recommended=multi_gpu_supported and topology.peer_to_peer_capable,
            rationale="Spread larger inference or throughput-oriented workloads across local GPUs.",
            strategy="distributed-local",
            gpu_count=len(gpu_indices),
            target_gpu_indices=gpu_indices,
            caveats=([] if multi_gpu_supported else ["At least two local GPUs are required for the multi-GPU profile."])
            + ([] if topology.peer_to_peer_capable or not multi_gpu_supported else ["Topology data did not confirm direct high-bandwidth GPU links."]),
        ),
        DeploymentProfileRecommendation(
            profile="cluster",
            label="Clustered",
            supported=(not needs_gpu) or cluster_supported,
            recommended=cluster_supported,
            rationale="Prepare the recipe for multi-host rollouts where network and shared storage are preconfigured.",
            strategy="cluster-orchestrated",
            gpu_count=len(gpu_indices),
            target_gpu_indices=gpu_indices,
            target_hosts=[metrics.hostname] if network_ready else [],
            caveats=([] if network_ready else ["Create `data/cluster/hosts.json` to declare remote-capable hosts."])
            + ([] if shared_storage_ready else ["Create `data/cluster/shared-storage.txt` to declare the shared model/data path."]),
        ),
    ]


async def get_recipe_deployment_plan(recipe: Recipe, selected: DeploymentSelection | None = None) -> DeploymentPlan:
    metrics = await get_system_metrics()
    topology = await get_gpu_topology_snapshot(metrics)
    hosts_ready = _cluster_hosts_path().is_file()
    shared_storage_file = _cluster_shared_storage_path()
    shared_storage_ready = shared_storage_file.is_file() and shared_storage_file.read_text(encoding="utf-8").strip() != ""

    current_selection = selected or DeploymentSelection(
        profile="multi-gpu" if len(metrics.gpus) >= 2 else "single-gpu",
        strategy="distributed-local" if len(metrics.gpus) >= 2 else "local-ui",
        target_gpu_indices=[gpu.index for gpu in metrics.gpus[:max(1, min(2, len(metrics.gpus)))]],
        target_hosts=[metrics.hostname] if hosts_ready else [],
        shared_storage_path=shared_storage_file.read_text(encoding="utf-8").strip() if shared_storage_ready else "",
        updated_at=int(time.time()),
    )

    warnings: list[str] = []
    if recipe.docker.gpu and not metrics.gpus:
        warnings.append("This recipe expects GPU acceleration, but no GPU telemetry is available on the current host.")
    if current_selection.profile == "cluster" and not (hosts_ready and shared_storage_ready):
        warnings.append("Cluster mode remains a planning profile until shared storage and remote host metadata are configured.")

    return DeploymentPlan(
        slug=recipe.slug,
        host_hostname=metrics.hostname,
        available_gpu_count=len(metrics.gpus),
        available_gpu_indices=[gpu.index for gpu in metrics.gpus],
        needs_gpu=bool(recipe.docker.gpu),
        shared_storage_ready=shared_storage_ready,
        network_ready=hosts_ready,
        topology=topology,
        selected=current_selection,
        recommendations=_build_recommendations(recipe, metrics, topology, current_selection, shared_storage_ready, hosts_ready),
        warnings=warnings,
    )


def _merge_gpu_entries(existing: list[GpuMetrics], incoming: list[GpuMetrics]) -> list[GpuMetrics]:
    merged = [gpu.model_copy(deep=True) for gpu in existing]

    def find_match(candidate: GpuMetrics):
        for gpu in merged:
            if candidate.uuid and gpu.uuid and candidate.uuid == gpu.uuid:
                return gpu
        for gpu in merged:
            if candidate.name and gpu.name == candidate.name:
                return gpu
        for gpu in merged:
            if candidate.index == gpu.index and candidate.vendor == gpu.vendor:
                return gpu
        return None

    scalar_fields = [
        "name",
        "vendor",
        "driver_version",
        "uuid",
        "compute_capability",
        "utilization_source",
        "temperature_source",
    ]
    numeric_fields = [
        "utilization",
        "memory_used_mb",
        "memory_total_mb",
        "temperature",
        "power_draw_watts",
        "power_limit_watts",
        "fan_speed_percent",
    ]

    for candidate in incoming:
        match = find_match(candidate)
        if not match:
            merged.append(candidate)
            continue

        for field in scalar_fields:
            value = getattr(candidate, field)
            if value and not getattr(match, field):
                setattr(match, field, value)
        for field in numeric_fields:
            value = getattr(candidate, field)
            if value and not getattr(match, field):
                setattr(match, field, value)
            elif field == "utilization" and value:
                setattr(match, field, int(value))
            elif field == "temperature" and value:
                setattr(match, field, float(value))

    return sorted(merged, key=lambda gpu: (gpu.index, gpu.name))


async def _populate_linux_lspci_gpu_metrics(metrics: SystemMetrics):
    if not shutil.which("lspci"):
        return

    output = await _run_command("lspci", "-mm")
    if not output:
        return

    gpus: list[GpuMetrics] = []
    gpu_index = 0
    for line in output.splitlines():
        if not line.strip():
            continue
        quoted = re.findall(r'"([^"]*)"', line)
        if len(quoted) < 3:
            continue
        controller_class = quoted[0]
        vendor = quoted[1]
        name = quoted[2]
        if controller_class not in {"VGA compatible controller", "3D controller", "Display controller"}:
            continue
        slot = line.split()[0]
        gpus.append(
            GpuMetrics(
                index=gpu_index,
                name=name,
                vendor=vendor,
                uuid=slot,
            )
        )
        gpu_index += 1

    if gpus:
        metrics.gpus = _merge_gpu_entries(metrics.gpus, gpus)


async def _populate_rocm_gpu_metrics(metrics: SystemMetrics):
    if not shutil.which("rocm-smi"):
        return

    output = await _run_command(
        "rocm-smi",
        "--showproductname",
        "--showuse",
        "--showtemp",
        "--showpower",
        "--showuniqueid",
        "--showmeminfo",
        "vram",
        "--json",
        timeout_seconds=8.0,
    )
    if not output:
        return

    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        return

    cards: list[GpuMetrics] = []
    items = data.items() if isinstance(data, dict) else enumerate(data)
    for position, (_, card) in enumerate(items):
        if not isinstance(card, dict):
            continue
        leaves = _collect_leaf_values(card)
        name = _pick_leaf_value(leaves, ("card", "series")) or _pick_leaf_value(leaves, ("product", "name")) or _pick_leaf_value(leaves, ("device", "name")) or f"AMD GPU {position}"
        uuid = _pick_leaf_value(leaves, ("unique", "id")) or _pick_leaf_value(leaves, ("serial",)) or ""
        utilization = _safe_int(_parse_numeric(_pick_leaf_value(leaves, ("gpu", "use"))))
        temperature = _safe_float(_parse_numeric(_pick_leaf_value(leaves, ("temperature", "edge")) or _pick_leaf_value(leaves, ("temperature",))))
        power = _safe_float(_parse_numeric(_pick_leaf_value(leaves, ("power",))))
        vram_total = _parse_numeric(_pick_leaf_value(leaves, ("vram", "total")))
        vram_used = _parse_numeric(_pick_leaf_value(leaves, ("vram", "used")))
        total_mb = _safe_int(vram_total / (1024 * 1024)) if vram_total > 1024 else _safe_int(vram_total)
        used_mb = _safe_int(vram_used / (1024 * 1024)) if vram_used > 1024 else _safe_int(vram_used)

        cards.append(
            GpuMetrics(
                index=position,
                name=str(name),
                vendor="AMD",
                uuid=str(uuid),
                utilization=utilization,
                utilization_source="rocm-smi",
                memory_used_mb=used_mb,
                memory_total_mb=total_mb,
                temperature=temperature,
                temperature_source="rocm-smi",
                power_draw_watts=power,
            )
        )

    if cards:
        metrics.gpus = _merge_gpu_entries(metrics.gpus, cards)
        if not metrics.gpu_temperature_source and any(gpu.temperature > 0 for gpu in cards):
            metrics.gpu_temperature_source = "rocm-smi"


async def _populate_intel_gpu_top_metrics(metrics: SystemMetrics):
    if not shutil.which("intel_gpu_top"):
        return

    output = await _run_command("intel_gpu_top", "-J", "-s", "1000", timeout_seconds=2.5)
    if not output:
        return

    objects = _decode_json_objects(output)
    if not objects:
        return

    latest = objects[-1]
    leaves = _collect_leaf_values(latest)
    busy_values = [
        _parse_numeric(value)
        for path, value in leaves
        if "busy" in path.lower() and "client" not in path.lower()
    ]
    render_values = [
        _parse_numeric(value)
        for path, value in leaves
        if any(fragment in path.lower() for fragment in ("render", "compute", "3d", "video")) and "busy" in path.lower()
    ]
    utilization = _safe_int(max(render_values or busy_values or [0.0]))

    intel_candidates = [gpu for gpu in metrics.gpus if "intel" in gpu.vendor.lower() or "intel" in gpu.name.lower()]
    if not intel_candidates and utilization <= 0:
        return

    if intel_candidates:
        intel_candidates[0].utilization = utilization
        intel_candidates[0].utilization_source = "intel_gpu_top"
    else:
        metrics.gpus = _merge_gpu_entries(
            metrics.gpus,
            [
                GpuMetrics(
                    index=len(metrics.gpus),
                    name="Intel GPU",
                    vendor="Intel",
                    utilization=utilization,
                    utilization_source="intel_gpu_top",
                )
            ],
        )


async def _populate_nvidia_gpu_metrics(metrics: SystemMetrics) -> bool:
    if not shutil.which("nvidia-smi"):
        return False

    output = await _run_command(
        "nvidia-smi",
        "--query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,uuid,driver_version,power.draw,power.limit,fan.speed",
        "--format=csv,noheader,nounits",
    )
    if not output:
        return False

    gpus: list[GpuMetrics] = []
    for raw_line in output.splitlines():
        if not raw_line.strip():
            continue
        parts = [part.strip() for part in raw_line.split(",")]
        if len(parts) < 11:
            continue
        gpus.append(
            GpuMetrics(
                index=_safe_int(parts[0]),
                name=parts[1],
                vendor="NVIDIA",
                utilization=_safe_int(parts[2]),
                utilization_source="nvidia-smi",
                memory_used_mb=_safe_int(parts[3]),
                memory_total_mb=_safe_int(parts[4]),
                temperature=_safe_float(parts[5]),
                temperature_source="nvidia-smi",
                uuid=parts[6],
                driver_version=parts[7],
                power_draw_watts=_safe_float(parts[8]),
                power_limit_watts=_safe_float(parts[9]),
                fan_speed_percent=_safe_int(parts[10]),
            )
        )

    compute_output = await _run_command(
        "nvidia-smi",
        "--query-gpu=index,compute_cap",
        "--format=csv,noheader,nounits",
    )
    compute_by_index: dict[int, str] = {}
    if compute_output:
        for raw_line in compute_output.splitlines():
            if not raw_line.strip():
                continue
            parts = [part.strip() for part in raw_line.split(",", maxsplit=1)]
            if len(parts) < 2:
                continue
            compute_by_index[_safe_int(parts[0])] = parts[1]

    for gpu in gpus:
        gpu.compute_capability = compute_by_index.get(gpu.index, "")

    if not gpus:
        return False

    metrics.gpus = gpus
    metrics.gpu_temperature_source = "nvidia-smi"
    _apply_gpu_summary(metrics)
    return True


async def _populate_windows_gpu_metrics(metrics: SystemMetrics):
    shell = shutil.which("powershell") or shutil.which("pwsh")
    if not shell:
        return

    output = await _run_command(
        shell,
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,AdapterCompatibility,PNPDeviceID,VideoProcessor,Status | ConvertTo-Json -Compress",
    )
    if not output:
        return

    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        return

    controllers = data if isinstance(data, list) else [data]
    gpus: list[GpuMetrics] = []
    for index, controller in enumerate(controllers):
        if not isinstance(controller, dict):
            continue
        total_mb = _safe_int(controller.get("AdapterRAM", 0) / (1024 * 1024)) if controller.get("AdapterRAM") else 0
        gpus.append(
            GpuMetrics(
                index=index,
                name=str(controller.get("Name") or "GPU"),
                vendor=str(controller.get("AdapterCompatibility") or ""),
                driver_version=str(controller.get("DriverVersion") or ""),
                uuid=str(controller.get("PNPDeviceID") or ""),
                memory_total_mb=total_mb,
            )
        )

    if not gpus:
        return

    metrics.gpus = _merge_gpu_entries(metrics.gpus, gpus)


async def _populate_windows_gpu_engine_counters(metrics: SystemMetrics):
    shell = shutil.which("powershell") or shutil.which("pwsh")
    if not shell:
        return

    script = (
        "$samples = (Get-Counter '\\GPU Engine(*)\\Utilization Percentage').CounterSamples;"
        "$samples | Select-Object InstanceName,CookedValue | ConvertTo-Json -Compress"
    )
    output = await _run_command(shell, "-NoProfile", "-Command", script, timeout_seconds=6.0)
    if not output:
        return

    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        return

    samples = data if isinstance(data, list) else [data]
    grouped: dict[str, float] = {}
    for sample in samples:
        if not isinstance(sample, dict):
            continue
        instance_name = str(sample.get("InstanceName") or "")
        if "engtype_" not in instance_name.lower():
            continue
        match = re.search(r"phys_(\d+)", instance_name, re.IGNORECASE)
        key = match.group(1) if match else instance_name.split("_")[-1]
        grouped[key] = grouped.get(key, 0.0) + max(0.0, _parse_numeric(sample.get("CookedValue")))

    if not grouped:
        return

    ordered_keys = sorted(grouped.keys(), key=lambda value: _safe_int(value) if str(value).isdigit() else 9999)
    for index, key in enumerate(ordered_keys):
        if index >= len(metrics.gpus):
            break
        metrics.gpus[index].utilization = min(100, _safe_int(grouped[key]))
        metrics.gpus[index].utilization_source = "windows-perfcounter"


async def _populate_gpu_metrics(metrics: SystemMetrics):
    populated = await _populate_nvidia_gpu_metrics(metrics)
    system_name = platform.system()
    if system_name == "Linux":
        await _populate_linux_lspci_gpu_metrics(metrics)
        await _populate_rocm_gpu_metrics(metrics)
        await _populate_intel_gpu_top_metrics(metrics)
    if system_name == "Windows":
        await _populate_windows_gpu_metrics(metrics)
        await _populate_windows_gpu_engine_counters(metrics)
        if metrics.gpus and not populated and not metrics.gpu_temperature_source:
            metrics.gpu_temperature_source = "windows-wmi"

    if metrics.gpus:
        _apply_gpu_summary(metrics)


async def get_system_metrics() -> SystemMetrics:
    metrics = SystemMetrics()

    metrics.platform = platform.platform()
    metrics.hostname = socket.gethostname()

    try:
        metrics.uptime_seconds = max(0, int(time.time() - psutil.boot_time()))
    except Exception:
        pass

    try:
        metrics.cpu_percent = round(psutil.cpu_percent(interval=None), 1)
        metrics.cpu_cores_logical = psutil.cpu_count() or 0
        metrics.cpu_cores_physical = psutil.cpu_count(logical=False) or 0
        freq = psutil.cpu_freq()
        if freq and getattr(freq, 'current', None) is not None:
            metrics.cpu_frequency_mhz = round(float(freq.current), 1)
    except Exception:
        pass

    cpu_temp, cpu_temp_source = await _resolve_cpu_temperature()
    metrics.cpu_temperature = cpu_temp
    metrics.cpu_temperature_source = cpu_temp_source

    try:
        memory = psutil.virtual_memory()
        metrics.ram_total_gb = _round_gb(memory.total)
        metrics.ram_used_gb = _round_gb(memory.total - memory.available)
        metrics.ram_percent = round(float(memory.percent), 1)
    except Exception:
        pass

    try:
        disk_root = settings.base_dir.anchor or str(settings.base_dir)
        usage = psutil.disk_usage(disk_root)
        metrics.disk_total_gb = _round_gb(usage.total)
        metrics.disk_used_gb = _round_gb(usage.used)
        metrics.disk_free_gb = _round_gb(usage.free)
        metrics.disk_percent = round(float(usage.percent), 1)
    except Exception:
        pass

    await _populate_gpu_metrics(metrics)

    return metrics
