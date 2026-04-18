from __future__ import annotations

import asyncio
import contextlib
import datetime as dt
import json
from pathlib import Path
import shutil
import re
from uuid import uuid4

import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from daemon.config import settings
from daemon.services.docker_service import get_installed_slugs, get_pending, is_ready, is_recipe_running
from daemon.services.models_state import build_model_backup_snapshot
from daemon.services.registry_service import get_recipe, get_recipe_dir, get_recipes


router = APIRouter(prefix="/api/models", tags=["models"])

OLLAMA_RUNTIME_SLUG = "ollama-runtime"
PLACEHOLDER_MODEL_HINTS = (
    "configured",
    "depends on",
    "create ",
    "collections",
    "graph schema",
    "provider/model alias",
    "after launch",
)
_HF_TOKEN_PATH = Path.home() / ".cache" / "huggingface" / "token"
_HF_QUEUE_LOCK = asyncio.Lock()
_HF_QUEUE_POLL_SECONDS = 5
_hf_queue_worker_task: asyncio.Task | None = None


class ModelActionRequest(BaseModel):
    name: str


class HFModelIntakeRequest(BaseModel):
    repository: str
    revision: str = "main"
    target_dir: str = "huggingface"
    notes: str = ""


def _utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def _hf_queue_path() -> Path:
    return settings.data_dir / "hf-model-intake-queue.json"


def _load_hf_queue() -> list[dict]:
    path = _hf_queue_path()
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _load_json_file(path: Path, fallback):
    if not path.is_file():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def _save_hf_queue(items: list[dict]) -> None:
    path = _hf_queue_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(items, indent=2), encoding="utf-8")


def _get_hf_token() -> str:
    try:
        return _HF_TOKEN_PATH.read_text(encoding="utf-8").strip() if _HF_TOKEN_PATH.is_file() else ""
    except OSError:
        return ""


def _hf_storage_root() -> Path:
    return settings.data_dir / "models" / "huggingface"


def _slugify_repo(repo: str) -> str:
    return repo.strip().lower().replace("/", "--")


def _deslugify_repo(value: str) -> str:
    return value.replace("--", "/")


def _normalize_model_key(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def _extract_repo_aliases(repository: str | None) -> list[str]:
    repo = str(repository or "").strip()
    if not repo:
        return []
    parts = [segment for segment in repo.split("/") if segment]
    aliases = {repo}
    if parts:
        aliases.add(parts[-1])
    normalized = [_normalize_model_key(item) for item in aliases]
    return [item for item in normalized if item]


def _model_matches_snapshot(model_hint: str | None, repository: str | None) -> bool:
    model_key = _normalize_model_key(model_hint)
    if not model_key:
        return False
    for alias in _extract_repo_aliases(repository):
        if alias == model_key or alias in model_key or model_key in alias:
            return True
    return False


def _dir_size_bytes(path: Path) -> int:
    total = 0
    try:
        for child in path.rglob("*"):
            if child.is_file():
                total += child.stat().st_size
    except OSError:
        return total
    return total


def _list_hf_snapshots() -> list[dict]:
    root = _hf_storage_root()
    queue_items = _load_hf_queue()
    snapshots: list[dict] = []
    if not root.is_dir():
        return snapshots

    queue_by_path = {}
    for item in queue_items:
        target_path = str(item.get("target_path") or "").strip()
        if target_path:
            queue_by_path[target_path] = item

    for target_dir in sorted([child for child in root.iterdir() if child.is_dir()], key=lambda item: item.name.lower()):
        for repo_dir in sorted([child for child in target_dir.iterdir() if child.is_dir()], key=lambda item: item.name.lower()):
            stat = repo_dir.stat()
            queue_item = queue_by_path.get(str(repo_dir))
            snapshots.append({
                "id": f"hf-snapshot-{target_dir.name}-{repo_dir.name}",
                "repository": queue_item.get("repository") if queue_item else _deslugify_repo(repo_dir.name),
                "revision": queue_item.get("revision", "main") if queue_item else "main",
                "target_dir": target_dir.name,
                "path": str(repo_dir),
                "size_bytes": _dir_size_bytes(repo_dir),
                "updated_at": dt.datetime.fromtimestamp(stat.st_mtime, tz=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                "queue_id": queue_item.get("id") if queue_item else "",
                "status": queue_item.get("status", "available") if queue_item else "available",
            })
    return snapshots


def _build_hf_queue_summary(items: list[dict], snapshots: list[dict] | None = None) -> dict:
    snapshot_list = snapshots if snapshots is not None else _list_hf_snapshots()
    return {
        "queued": len([item for item in items if item.get("status") == "queued"]),
        "running": len([item for item in items if item.get("status") == "running"]),
        "completed": len([item for item in items if item.get("status") == "completed"]),
        "failed": len([item for item in items if item.get("status") == "failed"]),
        "cancelled": len([item for item in items if item.get("status") == "cancelled"]),
        "deleted": len([item for item in items if item.get("status") == "deleted"]),
        "snapshot_count": len(snapshot_list),
        "downloaded_bytes": sum(int(item.get("size_bytes") or 0) for item in snapshot_list),
    }


def _build_hf_recipe_coverage(recipes: list[dict], snapshots: list[dict]) -> list[dict]:
    for recipe in recipes:
        actionable = recipe.get("actionable_model") or recipe.get("model_id") or ""
        matches = [
            {
                "id": snapshot.get("id"),
                "repository": snapshot.get("repository"),
                "revision": snapshot.get("revision"),
                "target_dir": snapshot.get("target_dir"),
                "path": snapshot.get("path"),
                "size_bytes": snapshot.get("size_bytes", 0),
                "status": snapshot.get("status", "available"),
            }
            for snapshot in snapshots
            if _model_matches_snapshot(actionable, snapshot.get("repository"))
        ]
        recipe["hf_snapshots"] = matches
        recipe["hf_covered"] = len(matches) > 0
        if recipe.get("actionable_model"):
            if recipe.get("actionable_model") and recipe.get("actionable_model").strip():
                recipe["coverage_source"] = "huggingface" if matches else "ollama"
        else:
            recipe["coverage_source"] = "manual"
    return recipes


def _find_hf_snapshot(snapshot_id: str) -> dict | None:
    return next((item for item in _list_hf_snapshots() if item.get("id") == snapshot_id), None)


def _download_hf_snapshot(repository: str, revision: str, local_dir: str, token: str) -> str:
    from huggingface_hub import snapshot_download

    path = snapshot_download(
        repo_id=repository,
        revision=revision,
        local_dir=local_dir,
        local_dir_use_symlinks=False,
        token=token or None,
        resume_download=True,
    )
    return str(path)


def _update_queue_item(items: list[dict], item_id: str, **changes) -> dict | None:
    for item in items:
        if item.get("id") == item_id:
            item.update(changes)
            return item
    return None


async def _set_queue_item(item_id: str, **changes) -> dict | None:
    async with _HF_QUEUE_LOCK:
        items = _load_hf_queue()
        item = _update_queue_item(items, item_id, **changes)
        if item is not None:
            _save_hf_queue(items)
        return item


async def _process_hf_queue_once() -> None:
    async with _HF_QUEUE_LOCK:
        items = _load_hf_queue()
        queued = next((item for item in items if item.get("status") == "queued"), None)
        if not queued:
            return
        queued["status"] = "running"
        queued["progress"] = max(queued.get("progress", 0), 5)
        queued["message"] = "Preparing Hugging Face snapshot download"
        queued["started_at"] = _utc_now()
        queued["worker"] = "local-background"
        _save_hf_queue(items)
        job = dict(queued)

    token = _get_hf_token()
    if not token:
        await _set_queue_item(
            job["id"],
            status="failed",
            progress=0,
            message="Hugging Face token is not configured on this host",
            completed_at=_utc_now(),
        )
        return

    target_root = _hf_storage_root() / (job.get("target_dir") or "huggingface") / _slugify_repo(job["repository"])
    target_root.mkdir(parents=True, exist_ok=True)
    await _set_queue_item(job["id"], progress=15, message="Downloading snapshot into shared storage", target_path=str(target_root))

    try:
        downloaded_path = await asyncio.to_thread(
            _download_hf_snapshot,
            job["repository"],
            job.get("revision") or "main",
            str(target_root),
            token,
        )
    except Exception as exc:  # noqa: BLE001
        await _set_queue_item(
            job["id"],
            status="failed",
            progress=0,
            message=f"Snapshot download failed: {exc}",
            completed_at=_utc_now(),
        )
        return

    await _set_queue_item(
        job["id"],
        status="completed",
        progress=100,
        message="Snapshot download completed",
        completed_at=_utc_now(),
        target_path=downloaded_path,
    )


async def hf_queue_worker() -> None:
    while True:
        try:
            await _process_hf_queue_once()
        except Exception:  # noqa: BLE001
            pass
        await asyncio.sleep(_HF_QUEUE_POLL_SECONDS)


def start_hf_queue_worker() -> None:
    global _hf_queue_worker_task
    if _hf_queue_worker_task and not _hf_queue_worker_task.done():
        return
    _hf_queue_worker_task = asyncio.create_task(hf_queue_worker())


async def stop_hf_queue_worker() -> None:
    global _hf_queue_worker_task
    if not _hf_queue_worker_task:
        return
    _hf_queue_worker_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await _hf_queue_worker_task
    _hf_queue_worker_task = None


def _normalize_model_hint(value: str | None) -> str:
    return str(value or "").strip()


def _is_actionable_model_hint(value: str | None) -> bool:
    normalized = _normalize_model_hint(value)
    if not normalized:
        return False
    lowered = normalized.lower()
    return not any(token in lowered for token in PLACEHOLDER_MODEL_HINTS)


def _build_recipe_model_hint(recipe) -> dict:
    model_hint = _normalize_model_hint(recipe.integration.model_id if recipe.integration else "")
    actionable = _is_actionable_model_hint(model_hint)
    return {
        "slug": recipe.slug,
        "name": recipe.name,
        "category": recipe.category,
        "model_id": model_hint,
        "actionable_model": model_hint if actionable else "",
        "needs_manual_configuration": bool(model_hint and not actionable),
        "hf_snapshots": [],
        "hf_covered": False,
        "coverage_source": "manual" if not actionable else "ollama",
    }


def _read_env_value(path: Path, key: str) -> str:
    if not path.is_file():
        return ""
    try:
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            current_key, value = line.split("=", 1)
            if current_key.strip() == key:
                return value.strip()
    except OSError:
        return ""
    return ""


def _get_ollama_runtime_context() -> dict:
    recipe = get_recipe(OLLAMA_RUNTIME_SLUG)
    recipe_dir = get_recipe_dir(OLLAMA_RUNTIME_SLUG)
    if not recipe or not recipe_dir:
        raise HTTPException(status_code=404, detail="Ollama Runtime recipe is not available")

    env_path = recipe_dir / ".env"
    env_template_path = recipe_dir / ".env.example"
    env_source = env_path if env_path.is_file() else env_template_path

    ui_port = _read_env_value(env_source, "OLLAMA_UI_PORT") or str(recipe.ui.port or 3014)
    host_port = _read_env_value(env_source, "OLLAMA_HOST_PORT") or "11435"
    shared_endpoint = _read_env_value(env_source, "SHARED_ENDPOINT") or f"http://localhost:{host_port}"

    return {
        "recipe": recipe,
        "recipe_dir": recipe_dir,
        "ui_port": int(ui_port),
        "host_port": int(host_port),
        "shared_endpoint": shared_endpoint,
        "runtime_ui_base": f"http://127.0.0.1:{ui_port}",
        "model_storage_path": str(recipe_dir / "data"),
        "env_path": str(env_path),
    }


async def _proxy_ollama_runtime(path: str, method: str = "GET", payload: dict | None = None) -> dict:
    context = _get_ollama_runtime_context()
    url = f"{context['runtime_ui_base']}{path}"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.request(method, url, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as response:
                data = await response.json(content_type=None)
                if response.status >= 400:
                    detail = data.get("detail") if isinstance(data, dict) else None
                    raise HTTPException(status_code=response.status, detail=detail or f"Runtime request failed: {response.status}")
                return data
    except aiohttp.ClientError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to reach Ollama Runtime management API: {exc}") from exc


@router.get("/overview")
async def models_overview():
    context = _get_ollama_runtime_context()
    slug = OLLAMA_RUNTIME_SLUG
    installed = slug in await get_installed_slugs()
    running = await is_recipe_running(slug) if installed else False
    ready = is_ready(slug) if running else False
    starting = get_pending(slug) in ("installing", "launching") or (running and not ready)
    dependent_recipes = []
    for recipe in get_recipes().values():
        if slug not in (recipe.depends_on or []):
            continue
        dependent_recipes.append(_build_recipe_model_hint(recipe))
    dependent_recipes.sort(key=lambda item: item["name"].lower())

    hf_snapshots = _list_hf_snapshots()
    dependent_recipes = _build_hf_recipe_coverage(dependent_recipes, hf_snapshots)

    recommended_models = []
    seen_models = set()

    starter_model = _normalize_model_hint(context["recipe"].integration.model_id if context["recipe"].integration else "")
    if _is_actionable_model_hint(starter_model):
        seen_models.add(starter_model)
        recommended_models.append({
            "name": starter_model,
            "reason": "Starter model for the shared Ollama runtime.",
            "source": "runtime",
            "recipes": [],
        })

    for recipe in dependent_recipes:
        model_name = recipe["actionable_model"]
        if not model_name:
            continue
        if model_name in seen_models:
            for item in recommended_models:
                if item["name"] == model_name:
                    item["recipes"].append({"slug": recipe["slug"], "name": recipe["name"]})
                    break
            continue

        seen_models.add(model_name)
        recommended_models.append({
            "name": model_name,
            "reason": f"Suggested by {recipe['name']}.",
            "source": "dependent-recipe",
            "recipes": [{"slug": recipe["slug"], "name": recipe["name"]}],
            "available_via_hf": bool(recipe.get("hf_covered")),
            "hf_repositories": [item.get("repository") for item in recipe.get("hf_snapshots", [])],
        })

    hf_queue = _load_hf_queue()
    hf_summary = _build_hf_queue_summary(hf_queue, hf_snapshots)
    coverage_summary = {
        "ollama_ready": len([item for item in dependent_recipes if item.get("actionable_model") and item.get("coverage_source") == "ollama"]),
        "hf_ready": len([item for item in dependent_recipes if item.get("hf_covered")]),
        "manual": len([item for item in dependent_recipes if not item.get("actionable_model")]),
    }

    return {
        "provider": "ollama",
        "recipe_slug": slug,
        "recipe_name": context["recipe"].name,
        "installed": installed,
        "running": running,
        "starting": starting,
        "ready": ready,
        "available": installed and ready,
        "ui_url": f"http://localhost:{context['ui_port']}",
        "shared_endpoint": context["shared_endpoint"],
        "runtime_api_url": f"http://localhost:{context['host_port']}",
        "model_storage_path": context["model_storage_path"],
        "env_path": context["env_path"],
        "dependent_recipes": dependent_recipes,
        "recommended_models": recommended_models,
        "hf_summary": hf_summary,
        "coverage_summary": coverage_summary,
        "download_sources": [
            {
                "id": "ollama-library",
                "label": "Ollama library",
                "status": "active",
                "description": "Shared runtime pulls and duplicate prevention are active now.",
            },
            {
                "id": "huggingface-intake",
                "label": "Hugging Face intake queue",
                "status": "active",
                "description": "Queue requests are persisted and processed by a local background worker into shared storage.",
                "summary": hf_summary,
            },
        ],
        "supports": {
            "browse": True,
            "download": True,
            "delete": True,
            "duplicate_prevention": True,
            "hugging_face": True,
            "hugging_face_queue": True,
            "ollama_registry": True,
        },
        "hugging_face": {
            "token_configured": bool(_get_hf_token()),
            "queue_storage_path": str(_hf_storage_root()),
        },
        "notes": [
            "This first P2.3 slice is powered by the shared Ollama Runtime recipe.",
            "Downloaded models are reused across Ollama-connected recipes through the shared runtime endpoint.",
            f"{len(dependent_recipes)} recipes currently declare a dependency on the shared Ollama runtime.",
            f"{len(recommended_models)} reusable model recommendations are surfaced from the runtime starter model and connected recipe metadata.",
            f"{hf_summary['snapshot_count']} Hugging Face snapshots currently exist in shared storage.",
        ],
    }


@router.get("/runtime")
async def models_runtime():
    return await _proxy_ollama_runtime("/api/runtime")


@router.get("/installed")
async def installed_models():
    inventory_path = settings.data_dir / "models" / "ollama-installed.json"
    inventory_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = await _proxy_ollama_runtime("/api/models")
    except HTTPException as exc:
        cached = _load_json_file(inventory_path, {"models": []})
        if exc.status_code == 502:
            if not isinstance(cached, dict):
                cached = {"models": []}
            cached.setdefault("models", [])
            cached["degraded"] = True
            cached["detail"] = str(exc.detail or "Failed to reach Ollama Runtime management API")
            return cached
        raise

    inventory_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


@router.get("/catalog")
async def model_catalog():
    return await _proxy_ollama_runtime("/api/catalog")


@router.get("/downloads")
async def model_downloads():
    runtime_downloads = await _proxy_ollama_runtime("/api/downloads")
    downloads = list(runtime_downloads.get("downloads", [])) if isinstance(runtime_downloads, dict) else []
    for item in _load_hf_queue():
        downloads.append({
            "id": item["id"],
            "name": item["repository"],
            "status": item.get("status", "queued"),
            "progress": item.get("progress", 0),
            "message": item.get("message", "Queued for future Hugging Face intake workflow"),
            "started_at": item.get("created_at", ""),
            "completed_at": item.get("completed_at", ""),
            "source": "huggingface",
            "revision": item.get("revision", "main"),
            "target_dir": item.get("target_dir", "huggingface"),
            "snapshot_deleted_at": item.get("snapshot_deleted_at", ""),
        })
    return {"downloads": downloads}


@router.get("/sources")
async def model_sources():
    queue = _load_hf_queue()
    snapshots = _list_hf_snapshots()
    summary = _build_hf_queue_summary(queue, snapshots)
    return {
        "sources": [
            {
                "id": "ollama-library",
                "label": "Ollama library",
                "status": "active",
                "queued_items": 0,
            },
            {
                "id": "huggingface-intake",
                "label": "Hugging Face intake queue",
                "status": "active",
                "queued_items": len([item for item in queue if item.get("status") == "queued"]),
                "running_items": len([item for item in queue if item.get("status") == "running"]),
                "completed_items": len([item for item in queue if item.get("status") == "completed"]),
                "failed_items": len([item for item in queue if item.get("status") == "failed"]),
                "cancelled_items": len([item for item in queue if item.get("status") == "cancelled"]),
                "deleted_items": len([item for item in queue if item.get("status") == "deleted"]),
                "downloaded_bytes": summary["downloaded_bytes"],
                "snapshot_count": summary["snapshot_count"],
            },
        ]
    }


@router.get("/huggingface")
async def huggingface_inventory():
    snapshot = build_model_backup_snapshot()
    snapshots = _list_hf_snapshots()
    queue = _load_hf_queue()
    return {
        "token_configured": bool(_get_hf_token()),
        "storage_path": str(_hf_storage_root()),
        "summary": _build_hf_queue_summary(queue, snapshots),
        "snapshots": snapshots,
        "backup_snapshot": snapshot,
    }


@router.post("/huggingface/{snapshot_id}/delete")
async def delete_huggingface_snapshot(snapshot_id: str):
    snapshot = _find_hf_snapshot(snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    queue_id = str(snapshot.get("queue_id") or "")
    queue_items = _load_hf_queue()
    queue_item = next((item for item in queue_items if item.get("id") == queue_id), None) if queue_id else None
    if queue_item and queue_item.get("status") == "running":
        raise HTTPException(status_code=409, detail="Running Hugging Face downloads cannot be deleted")

    target_path = Path(snapshot["path"])
    if target_path.exists():
        try:
            shutil.rmtree(target_path)
        except OSError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to delete snapshot: {exc}") from exc

    if queue_item is not None:
        queue_item.update({
            "status": "deleted",
            "progress": 0,
            "message": "Snapshot deleted from shared storage",
            "snapshot_deleted_at": _utc_now(),
            "target_path": "",
        })
        _save_hf_queue(queue_items)

    return {
        "deleted": True,
        "snapshot_id": snapshot_id,
        "path": str(target_path),
    }


@router.get("/intake")
async def hf_model_intake_queue():
    return {"items": _load_hf_queue()}


@router.post("/intake")
async def queue_hf_model_intake(body: HFModelIntakeRequest):
    repository = body.repository.strip()
    if not repository or "/" not in repository:
        raise HTTPException(status_code=400, detail="Repository must be in owner/model format")

    items = _load_hf_queue()
    duplicate = next((item for item in items if item.get("repository", "").lower() == repository.lower() and item.get("revision", "main") == body.revision and item.get("status") in {"queued", "planned", "running"}), None)
    if duplicate:
        return duplicate

    item = {
        "id": f"hf-{uuid4().hex[:10]}",
        "repository": repository,
        "revision": body.revision.strip() or "main",
        "target_dir": body.target_dir.strip() or "huggingface",
        "notes": body.notes.strip(),
        "status": "queued",
        "progress": 0,
        "message": "Queued for future Hugging Face intake workflow",
        "created_at": _utc_now(),
        "source": "huggingface",
    }
    items.insert(0, item)
    _save_hf_queue(items)
    return item


@router.post("/intake/{item_id}/cancel")
async def cancel_hf_model_intake(item_id: str):
    async with _HF_QUEUE_LOCK:
        items = _load_hf_queue()
        item = next((entry for entry in items if entry.get("id") == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Queue item not found")
        if item.get("status") == "running":
            raise HTTPException(status_code=409, detail="Running downloads cannot be cancelled yet")
        item.update({
            "status": "cancelled",
            "progress": 0,
            "message": "Queue item cancelled",
            "completed_at": _utc_now(),
        })
        _save_hf_queue(items)
        return item


@router.post("/intake/{item_id}/retry")
async def retry_hf_model_intake(item_id: str):
    async with _HF_QUEUE_LOCK:
        items = _load_hf_queue()
        item = next((entry for entry in items if entry.get("id") == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Queue item not found")
        item.update({
            "status": "queued",
            "progress": 0,
            "message": "Queued for Hugging Face intake workflow",
            "started_at": "",
            "completed_at": "",
        })
        _save_hf_queue(items)
        return item


@router.post("/pull")
async def pull_model(body: ModelActionRequest):
    return await _proxy_ollama_runtime("/api/models/pull", method="POST", payload=body.model_dump())


@router.post("/delete")
async def delete_model(body: ModelActionRequest):
    return await _proxy_ollama_runtime("/api/models/delete", method="POST", payload=body.model_dump())