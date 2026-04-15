from __future__ import annotations
import asyncio
import os
import secrets
import shutil
import subprocess
from pathlib import Path
from typing import AsyncGenerator

import yaml
import aiohttp

from daemon.config import settings
from daemon.db import get_db
from daemon.models.container import ContainerInfo
from daemon.services.registry_service import get_recipe_dir, get_recipe


# In-memory readiness cache: slug -> True
_ready_cache: dict[str, bool] = {}
# Track active health check tasks: slug -> Task
_health_tasks: dict[str, asyncio.Task] = {}
# Track in-flight actions to prevent wrong states during transitions
# slug -> "launching" | "stopping" | "installing"
_pending_actions: dict[str, str] = {}


def mark_ready(slug: str):
    _ready_cache[slug] = True
    _pending_actions.pop(slug, None)


def clear_ready(slug: str):
    _ready_cache.pop(slug, None)
    if slug in _health_tasks:
        _health_tasks[slug].cancel()
        _health_tasks.pop(slug)


def is_ready(slug: str) -> bool:
    return _ready_cache.get(slug, False)


def set_pending(slug: str, action: str):
    _pending_actions[slug] = action


def clear_pending(slug: str):
    _pending_actions.pop(slug, None)


def get_pending(slug: str) -> str | None:
    return _pending_actions.get(slug)


async def start_health_check(slug: str):
    """Start a background health check task if one isn't already running."""
    if is_ready(slug):
        return
    if slug in _health_tasks and not _health_tasks[slug].done():
        return

    recipe = get_recipe(slug)
    if not recipe:
        return

    ui_port = recipe.ui.port if recipe.ui else 8080
    ui_path = recipe.ui.path if recipe.ui else "/"
    health_path = recipe.ui.health_path if recipe.ui and recipe.ui.health_path else ui_path
    ui_scheme = recipe.ui.scheme if recipe.ui and recipe.ui.scheme else "http"
    skip_verify = bool(recipe.ui and recipe.ui.insecure_skip_verify)

    async def _check():
        url = f"{ui_scheme}://127.0.0.1:{ui_port}{health_path}"
        # Up to 5 minutes of polling
        async with aiohttp.ClientSession() as session:
            for _ in range(300):
                await asyncio.sleep(1)
                try:
                    async with session.get(
                        url,
                        timeout=aiohttp.ClientTimeout(total=3),
                        allow_redirects=True,
                        ssl=False if ui_scheme == "https" and skip_verify else None,
                    ) as resp:
                        if 200 <= resp.status < 400:
                            mark_ready(slug)
                            print(f"[health] {slug} is ready at {url} ({resp.status})")
                            return
                except Exception:
                    pass
        print(f"[health] {slug} health check timed out")

    _health_tasks[slug] = asyncio.create_task(_check())


def _compose_project(slug: str) -> str:
    return f"spark-ai-hub-{slug}"


def _compose_cmd(slug: str, recipe_dir: Path) -> list[str]:
    return [
        "docker", "compose",
        "-p", _compose_project(slug),
        "-f", str(recipe_dir / "docker-compose.yml"),
    ]


def _runtime_env_file(recipe_dir: Path) -> Path:
    return recipe_dir / ".env"


def _runtime_env_template_file(recipe_dir: Path) -> Path:
    return recipe_dir / ".env.example"


def _render_runtime_env(template_text: str) -> str:
    shared_secrets: dict[str, str] = {
        "minio_password": secrets.token_urlsafe(24),
    }
    generated_values = {
        "USER_AUTH_SECRET": secrets.token_urlsafe(48),
        "POSTGRES_PASSWORD": secrets.token_urlsafe(24),
        "OPENSEARCH_ADMIN_PASSWORD": secrets.token_urlsafe(24),
        "MINIO_ROOT_PASSWORD": shared_secrets["minio_password"],
        "MINIO_SECRET_KEY": shared_secrets["minio_password"],
        "S3_AWS_SECRET_ACCESS_KEY": shared_secrets["minio_password"],
    }

    rendered_lines: list[str] = []
    for line in template_text.splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            rendered_lines.append(line)
            continue

        key, value = line.split("=", 1)
        if key in generated_values and not value.strip():
            value = generated_values[key]
        rendered_lines.append(f"{key}={value}")

    return "\n".join(rendered_lines) + "\n"


def ensure_runtime_env(recipe_dir: Path) -> tuple[Path | None, bool]:
    env_file = _runtime_env_file(recipe_dir)
    if env_file.is_file():
        return env_file, False

    template_file = _runtime_env_template_file(recipe_dir)
    if not template_file.is_file():
        return None, False

    env_file.write_text(_render_runtime_env(template_file.read_text()))
    env_file.chmod(0o600)
    return env_file, True


def _parse_vllm_model_service(recipe_dir: Path) -> tuple[str, str] | None:
    """Return (service_name, model_repo) for vLLM-style compose services."""
    compose_file = recipe_dir / "docker-compose.yml"
    if not compose_file.is_file():
        return None

    try:
        with open(compose_file, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    except Exception:
        return None

    for service_name, service in (data.get("services") or {}).items():
        command = service.get("command")
        if not command:
            continue

        tokens = command.split() if isinstance(command, str) else [str(token) for token in command]
        for index, token in enumerate(tokens):
            if token == "--model" and index + 1 < len(tokens):
                return service_name, tokens[index + 1]
            if token.startswith("--model="):
                return service_name, token.split("=", 1)[1]

    return None


async def _stream_proc(
    cmd: list[str],
    cwd: str,
    env: dict | None = None,
) -> AsyncGenerator[tuple[str, int | None], None]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=cwd,
        env=env,
    )

    async for line in proc.stdout:
        text = line.decode(errors="replace").rstrip()
        if "\r" in text:
            text = text.rsplit("\r", 1)[-1]
        if text:
            yield text, None

    await proc.wait()
    yield "", proc.returncode


async def install_recipe(slug: str) -> AsyncGenerator[str, None]:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        yield f"[error] Recipe directory not found for {slug}"
        return

    compose_file = recipe_dir / "docker-compose.yml"
    if not compose_file.is_file():
        yield f"[error] docker-compose.yml not found in {recipe_dir}"
        return

    runtime_env_file, created_env = ensure_runtime_env(recipe_dir)
    if _runtime_env_template_file(recipe_dir).is_file() and runtime_env_file is None:
        yield f"[error] Failed to prepare runtime env for {slug}"
        return
    if created_env and runtime_env_file:
        yield f"[spark-ai-hub] Generated runtime config at {runtime_env_file}"

    recipe = get_recipe(slug)
    build_recipe = bool(recipe and recipe.docker and recipe.docker.build)
    vllm_model = None if build_recipe else _parse_vllm_model_service(recipe_dir)

    yield f"[spark-ai-hub] Starting install for {slug}..."
    if vllm_model is not None:
        service_name, model_repo = vllm_model

        pull_cmd = _compose_cmd(slug, recipe_dir) + ["pull"]
        yield f"[spark-ai-hub] Pulling image: {' '.join(pull_cmd)}"

        rc = None
        async for text, code in _stream_proc(pull_cmd, str(recipe_dir)):
            if text:
                yield text
            if code is not None:
                rc = code

        if rc != 0:
            yield f"[spark-ai-hub] Install failed with exit code {rc}"
            return

        env = _launch_env()
        token = env.get("HF_TOKEN", "")
        run_cmd = _compose_cmd(slug, recipe_dir) + [
            "run",
            "--rm",
            "--no-deps",
            "-e",
            f"HF_TOKEN={token}",
            "-e",
            "HF_HUB_OFFLINE=0",
            "-e",
            "TRANSFORMERS_OFFLINE=0",
            "--entrypoint",
            "python3",
            service_name,
            "-c",
            (
                "import os; from huggingface_hub import snapshot_download; "
                f"p = snapshot_download('{model_repo}'); "
                "print(f'[prefetch] weights ready at {p}')"
            ),
        ]
        yield f"[spark-ai-hub] Prefetching weights for {model_repo} (no port bind)..."
        yield f"[spark-ai-hub] Running: {' '.join(run_cmd)}"

        rc = None
        async for text, code in _stream_proc(run_cmd, str(recipe_dir), env=env):
            if text:
                yield text
            if code is not None:
                rc = code

        if rc != 0:
            yield f"[spark-ai-hub] Install failed with exit code {rc}"
            return
    else:
        cmd = _compose_cmd(slug, recipe_dir) + ["up", "-d"]
        if build_recipe:
            cmd.append("--build")
        yield f"[spark-ai-hub] Running: {' '.join(cmd)}"

        rc = None
        async for text, code in _stream_proc(cmd, str(recipe_dir)):
            if text:
                yield text
            if code is not None:
                rc = code

        if rc != 0:
            yield f"[spark-ai-hub] Install failed with exit code {rc}"
            return

    db = await get_db()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO installed_recipes (slug, status, compose_project) VALUES (?, 'installed', ?)",
            (slug, _compose_project(slug)),
        )
        await db.commit()
    finally:
        await db.close()

    yield f"[spark-ai-hub] {slug} installed successfully!"


async def update_recipe(slug: str) -> AsyncGenerator[str, None]:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        yield f"[error] Recipe directory not found for {slug}"
        return

    compose_file = recipe_dir / "docker-compose.yml"
    if not compose_file.is_file():
        yield f"[error] docker-compose.yml not found in {recipe_dir}"
        return

    runtime_env_file, created_env = ensure_runtime_env(recipe_dir)
    if _runtime_env_template_file(recipe_dir).is_file() and runtime_env_file is None:
        yield f"[error] Failed to prepare runtime env for {slug}"
        return
    if created_env and runtime_env_file:
        yield f"[spark-ai-hub] Generated runtime config at {runtime_env_file}"

    recipe = get_recipe(slug)
    build_recipe = bool(recipe and recipe.docker and recipe.docker.build)

    if build_recipe:
        yield f"[spark-ai-hub] Rebuilding local image for {slug}..."
        up_cmd = _compose_cmd(slug, recipe_dir) + ["up", "-d", "--build"]
        yield f"[spark-ai-hub] Running: {' '.join(up_cmd)}"

        proc = await asyncio.create_subprocess_exec(
            *up_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(recipe_dir),
        )

        async for line in proc.stdout:
            text = line.decode(errors="replace").rstrip()
            if '\r' in text:
                text = text.rsplit('\r', 1)[-1]
            if text:
                yield text

        await proc.wait()

        if proc.returncode == 0:
            yield f"[spark-ai-hub] {slug} rebuilt successfully!"
        else:
            yield f"[spark-ai-hub] Rebuild failed with exit code {proc.returncode}"
        return

    # Phase 1: Pull latest images
    yield f"[spark-ai-hub] Pulling latest images for {slug}..."
    pull_cmd = _compose_cmd(slug, recipe_dir) + ["pull"]
    yield f"[spark-ai-hub] Running: {' '.join(pull_cmd)}"

    proc = await asyncio.create_subprocess_exec(
        *pull_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(recipe_dir),
    )

    async for line in proc.stdout:
        text = line.decode(errors="replace").rstrip()
        if '\r' in text:
            text = text.rsplit('\r', 1)[-1]
        if text:
            yield text

    await proc.wait()

    if proc.returncode != 0:
        yield f"[spark-ai-hub] Pull failed with exit code {proc.returncode}"
        return

    # Phase 2: Recreate containers with new images
    yield f"[spark-ai-hub] Recreating containers for {slug}..."
    up_cmd = _compose_cmd(slug, recipe_dir) + ["up", "-d"]
    yield f"[spark-ai-hub] Running: {' '.join(up_cmd)}"

    proc = await asyncio.create_subprocess_exec(
        *up_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(recipe_dir),
    )

    async for line in proc.stdout:
        text = line.decode(errors="replace").rstrip()
        if '\r' in text:
            text = text.rsplit('\r', 1)[-1]
        if text:
            yield text

    await proc.wait()

    if proc.returncode == 0:
        yield f"[spark-ai-hub] {slug} updated successfully!"
    else:
        yield f"[spark-ai-hub] Update failed with exit code {proc.returncode}"


def _launch_env() -> dict:
    """Environment for container launches, with auto-detected HF token."""
    env = {**os.environ}
    # Auto-detect HuggingFace token so gated models work out of the box
    if not env.get("HF_TOKEN"):
        token_path = Path.home() / ".cache" / "huggingface" / "token"
        if token_path.is_file():
            env["HF_TOKEN"] = token_path.read_text().strip()
    return env


async def launch_recipe(slug: str) -> str:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        return f"Recipe directory not found for {slug}"

    runtime_env_file, _ = ensure_runtime_env(recipe_dir)
    if _runtime_env_template_file(recipe_dir).is_file() and runtime_env_file is None:
        return f"Failed to prepare runtime env for {slug}"

    cmd = _compose_cmd(slug, recipe_dir) + ["up", "-d"]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(recipe_dir),
        env=_launch_env(),
    )
    output = await proc.stdout.read()
    await proc.wait()

    if proc.returncode == 0:
        db = await get_db()
        try:
            await db.execute(
                "INSERT OR REPLACE INTO installed_recipes (slug, status, compose_project) VALUES (?, 'installed', ?)",
                (slug, _compose_project(slug)),
            )
            await db.commit()
        finally:
            await db.close()
        return "launched"
    return output.decode(errors="replace")


async def stop_recipe(slug: str) -> str:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        return f"Recipe directory not found for {slug}"

    cmd = _compose_cmd(slug, recipe_dir) + ["down"]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(recipe_dir),
    )
    await proc.wait()
    return "stopped" if proc.returncode == 0 else "failed"


async def restart_recipe(slug: str) -> str:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        return f"Recipe directory not found for {slug}"

    runtime_env_file, _ = ensure_runtime_env(recipe_dir)
    if _runtime_env_template_file(recipe_dir).is_file() and runtime_env_file is None:
        return f"Failed to prepare runtime env for {slug}"

    cmd = _compose_cmd(slug, recipe_dir) + ["restart"]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(recipe_dir),
        env=_launch_env(),
    )
    output = await proc.stdout.read()
    await proc.wait()

    if proc.returncode == 0:
        return "restarted"

    fallback_cmd = _compose_cmd(slug, recipe_dir) + ["up", "-d"]
    fallback_proc = await asyncio.create_subprocess_exec(
        *fallback_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(recipe_dir),
        env=_launch_env(),
    )
    fallback_output = await fallback_proc.stdout.read()
    await fallback_proc.wait()

    if fallback_proc.returncode == 0:
        return "restarted"

    combined = b"\n".join(part for part in [output, fallback_output] if part)
    return combined.decode(errors="replace") or "failed"


async def remove_recipe(slug: str, delete_data: bool = True) -> str:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        return f"Recipe directory not found for {slug}"

    cmd = _compose_cmd(slug, recipe_dir) + ["down", "--rmi", "all", "--volumes"]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(recipe_dir),
    )
    await proc.wait()

    if proc.returncode == 0:
        cleanup_errors: list[str] = []
        if delete_data:
            for path in _find_recipe_bind_paths(slug):
                try:
                    if path.is_dir():
                        shutil.rmtree(path)
                    elif path.exists():
                        path.unlink()
                except FileNotFoundError:
                    continue
                except Exception as exc:
                    cleanup_errors.append(f"{path}: {exc}")

            data_root = recipe_dir / "data"
            if data_root.exists():
                try:
                    if not any(data_root.iterdir()):
                        data_root.rmdir()
                except Exception as exc:
                    cleanup_errors.append(f"{data_root}: {exc}")

        db = await get_db()
        try:
            await db.execute("DELETE FROM installed_recipes WHERE slug = ?", (slug,))
            await db.commit()
        finally:
            await db.close()
        return "removed" if not cleanup_errors else f"partial: {'; '.join(cleanup_errors)}"
    return "failed"


async def get_running_containers() -> list[ContainerInfo]:
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "ps", "--filter", "label=com.docker.compose.project",
            "--format", '{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}',
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
    except Exception:
        return []

    containers = []
    for line in stdout.decode().strip().splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        name = parts[0] if len(parts) > 0 else ""
        status = parts[1] if len(parts) > 1 else ""
        image = parts[2] if len(parts) > 2 else ""
        ports_str = parts[3] if len(parts) > 3 else ""
        containers.append(ContainerInfo(
            name=name,
            status=status,
            image=image,
            ports=_parse_ports(ports_str),
        ))
    return containers


def _parse_ports(ports_str: str) -> dict[str, int | None]:
    ports = {}
    if not ports_str:
        return ports
    for mapping in ports_str.split(", "):
        if "->" in mapping:
            host_part, container_part = mapping.split("->")
            host_port = host_part.rsplit(":", 1)[-1]
            container_port = container_part.split("/")[0]
            ports[container_port] = int(host_port)
    return ports


async def get_project_for_slug(slug: str) -> str | None:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT compose_project FROM installed_recipes WHERE slug = ?", (slug,)
        )
        row = await cursor.fetchone()
        return row["compose_project"] if row else None
    finally:
        await db.close()


async def is_recipe_running(slug: str) -> bool:
    project = _compose_project(slug)
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "ps", "-q",
            "--filter", f"label=com.docker.compose.project={project}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        return len(stdout.decode().strip()) > 0
    except Exception:
        return False


async def get_running_recipe_slugs(installed_slugs: set[str] | None = None) -> set[str]:
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "ps",
            "--format", '{{.Label "com.docker.compose.project"}}',
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        prefix = "spark-ai-hub-"
        running: set[str] = set()

        for line in stdout.decode().splitlines():
            project = line.strip()
            if not project.startswith(prefix):
                continue

            slug = project[len(prefix):]
            if installed_slugs is not None and slug not in installed_slugs:
                continue

            running.add(slug)

        return running
    except Exception:
        return set()


async def get_container_name(slug: str) -> str | None:
    project = _compose_project(slug)
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "compose", "-p", project, "ps",
            "--format", "{{.Names}}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        names = stdout.decode().strip().splitlines()
        return names[0] if names else None
    except Exception:
        return None


async def get_installed_slugs() -> set[str]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT slug FROM installed_recipes")
        rows = await cursor.fetchall()
        return {row["slug"] for row in rows}
    finally:
        await db.close()


def _parse_compose_images(slug: str) -> list[str]:
    """Parse docker-compose.yml to extract image names."""
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        return []
    compose_file = recipe_dir / "docker-compose.yml"
    if not compose_file.is_file():
        return []

    with open(compose_file) as f:
        data = yaml.safe_load(f)

    images = []
    for svc in (data.get("services") or {}).values():
        img = svc.get("image")
        if img:
            images.append(img)
    return images


def _find_recipe_bind_paths(slug: str) -> list[Path]:
    """Find bind-mounted local paths located under the recipe directory."""
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        return []

    compose_file = recipe_dir / "docker-compose.yml"
    if not compose_file.is_file():
        return []

    with open(compose_file) as f:
        data = yaml.safe_load(f)

    recipe_root = recipe_dir.resolve()
    matches: list[Path] = []
    protected_files = {
        (recipe_dir / "docker-compose.yml").resolve(),
        (recipe_dir / "recipe.yaml").resolve(),
        (recipe_dir / ".env").resolve(),
        (recipe_dir / ".env.example").resolve(),
    }

    for svc in (data.get("services") or {}).values():
        for volume in (svc.get("volumes") or []):
            source = None
            if isinstance(volume, str):
                parts = volume.split(":", 1)
                if len(parts) == 2:
                    source = parts[0].strip()
            elif isinstance(volume, dict) and volume.get("type") == "bind":
                source = (volume.get("source") or "").strip()

            if not source or source.startswith("/"):
                continue

            candidate = (recipe_dir / source).resolve()
            try:
                candidate.relative_to(recipe_root)
            except ValueError:
                continue

            if candidate in protected_files:
                continue

            if candidate not in matches:
                matches.append(candidate)

    return matches


async def _find_project_volumes(slug: str) -> list[str]:
    """Find Docker volumes belonging to any spark-ai-hub compose project for this slug."""
    # Try both the current project name and common historical variants
    project = _compose_project(slug)
    # Also check without the trailing slug suffix parts (e.g. spark-ai-hub-hunyuan3d vs spark-ai-hub-hunyuan3d-spark)
    prefixes = {project + "_"}
    base = slug.rsplit("-", 1)[0] if "-" in slug else slug
    if base != slug:
        prefixes.add(f"spark-ai-hub-{base}_")

    proc = await asyncio.create_subprocess_exec(
        "docker", "volume", "ls", "-q",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    all_volumes = stdout.decode().strip().splitlines()

    matched = []
    for v in all_volumes:
        if any(v.startswith(p) for p in prefixes):
            matched.append(v)
    return matched


async def _find_project_images(slug: str) -> list[str]:
    """Find Docker images that were used by a spark-ai-hub compose project for this slug.

    Only matches images that are not currently used by any running container,
    to avoid removing images used by non-NVIDIA AI Hub containers.
    """
    compose_images = _parse_compose_images(slug)
    if not compose_images:
        return []

    # Get images currently in use by running containers
    proc = await asyncio.create_subprocess_exec(
        "docker", "ps", "--format", "{{.Image}}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    in_use = set(stdout.decode().strip().splitlines())

    matched = []
    for img in compose_images:
        # Check exact image:tag exists
        proc = await asyncio.create_subprocess_exec(
            "docker", "images", "-q", img,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if stdout.decode().strip() and img not in in_use:
            matched.append(img)

    return matched


async def has_recipe_leftovers(slug: str) -> bool:
    """Check if any Docker images or volumes from a recipe still exist."""
    volumes = await _find_project_volumes(slug)
    if volumes:
        return True

    images = await _find_project_images(slug)
    if images:
        return True

    return False


async def purge_recipe(slug: str) -> str:
    """Remove all leftover Docker images and volumes for a recipe."""
    errors = []

    volumes = await _find_project_volumes(slug)
    for vol in volumes:
        proc = await asyncio.create_subprocess_exec(
            "docker", "volume", "rm", "-f", vol,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            err = stderr.decode().strip()
            if err and "No such volume" not in err:
                errors.append(err)

    images = await _find_project_images(slug)
    for img in images:
        proc = await asyncio.create_subprocess_exec(
            "docker", "rmi", "-f", img,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            err = stderr.decode().strip()
            if err and "No such image" not in err:
                errors.append(err)

    return "purged" if not errors else f"partial: {'; '.join(errors)}"
