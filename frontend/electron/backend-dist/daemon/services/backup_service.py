from __future__ import annotations

import asyncio
import datetime as dt
import json
from pathlib import Path
from uuid import uuid4

from daemon.config import settings
from daemon.services.docker_service import get_installed_slugs, install_recipe, is_recipe_running, launch_recipe
from daemon.services.models_state import build_model_backup_snapshot, clear_ollama_restore_plan, diff_model_backup_snapshot, enqueue_model_backup_restore
from daemon.services.registry_service import get_recipe, get_recipe_dir, get_recipes
import aiohttp


_restore_jobs: dict[str, dict] = {}


def _utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def _backup_dir() -> Path:
    path = settings.backups_path
    path.mkdir(parents=True, exist_ok=True)
    return path


def _latest_backup_path() -> Path:
    return _backup_dir() / "nvidia-ai-hub-backup-latest.json"


def _restore_jobs_path() -> Path:
    return _backup_dir() / "restore-jobs.json"


def _restore_job_runtime_path(job_id: str) -> Path:
    return _backup_dir() / f"{job_id}.json"


def _serialize_job(job: dict) -> dict:
    return {
        key: value
        for key, value in job.items()
        if key != "_task"
    }


def _persist_restore_jobs() -> None:
    jobs = [_serialize_job(job) for job in _restore_jobs.values()]
    _restore_jobs_path().write_text(json.dumps(jobs, indent=2), encoding="utf-8")


def _persist_restore_job(job: dict) -> None:
    runtime_path = _restore_job_runtime_path(str(job.get("job_id") or "restore-job"))
    runtime_path.write_text(json.dumps(_serialize_job(job), indent=2), encoding="utf-8")
    _persist_restore_jobs()


def _load_restore_jobs() -> dict[str, dict]:
    path = _restore_jobs_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(data, list):
        return {}

    jobs = {}
    for item in data:
        if not isinstance(item, dict):
            continue
        job_id = str(item.get("job_id") or "").strip()
        if not job_id:
            continue
        jobs[job_id] = item
    return jobs


async def build_backup_snapshot() -> dict:
    installed_slugs = await get_installed_slugs()
    recipes = []
    for slug in sorted(installed_slugs):
        recipe = get_recipe(slug)
        if not recipe:
            continue
        recipes.append(
            {
                "slug": recipe.slug,
                "name": recipe.name,
                "category": recipe.category,
                "running": await is_recipe_running(slug),
                "deployment_selection_path": str(settings.deployments_path / slug / "selection.json"),
                "deployment_selection": _read_json_if_exists(settings.deployments_path / slug / "selection.json"),
            }
        )

    snapshot = {
        "schema_version": "2026-04-18",
        "created_at": _utc_now(),
        "hostname": settings.host,
        "recipes": recipes,
        "models": build_model_backup_snapshot(),
        "notes": [
            "Exported from NVIDIA AI Hub backup and restore workflow.",
            "Recipe runtime data volumes are not embedded in this JSON export.",
            "Deployment selections are included when they were previously saved.",
        ],
    }

    path = _latest_backup_path()
    path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    return {"snapshot": snapshot, "path": str(path), "filename": path.name}


def preview_backup_restore(snapshot: dict) -> dict:
    recipes_payload = snapshot.get("recipes") if isinstance(snapshot, dict) else []
    requested_recipes = recipes_payload if isinstance(recipes_payload, list) else []
    model_diff = diff_model_backup_snapshot(snapshot.get("models") if isinstance(snapshot, dict) else {})

    registry = get_recipes()
    installable = []
    missing = []
    for item in requested_recipes:
      slug = str(item.get("slug") or "").strip()
      if not slug:
          continue
      recipe = registry.get(slug)
      if recipe:
          installable.append(
              {
                  "slug": slug,
                  "name": recipe.name,
                  "category": recipe.category,
                  "running": bool(item.get("running")),
                  "deployment_selection": item.get("deployment_selection"),
              }
          )
      else:
          missing.append({"slug": slug, "name": item.get("name") or slug})

    warnings = []
    if missing:
        warnings.append(f"{len(missing)} recipe(s) from the backup are not present in the current registry.")
    if model_diff.get("huggingface_missing_count", 0) > 0:
        warnings.append("Hugging Face snapshot restore requires a configured Hugging Face token and shared storage access.")
    if model_diff.get("ollama_missing_count", 0) > 0:
        warnings.append("Ollama model restore requires the shared Ollama runtime to be reachable on the target host.")

    return {
        "created_at": snapshot.get("created_at") if isinstance(snapshot, dict) else "",
        "installable_recipes": installable,
        "missing_recipes": missing,
        "model_diff": model_diff,
        "warnings": warnings,
    }


async def apply_backup_restore(snapshot: dict) -> dict:
    preview = preview_backup_restore(snapshot)
    deployment_dir = settings.deployments_path
    saved_deployments = []
    for item in preview["installable_recipes"]:
        selection = item.get("deployment_selection")
        if not selection:
            continue
        target_dir = deployment_dir / item["slug"]
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / "selection.json"
        target_path.write_text(json.dumps(selection, indent=2), encoding="utf-8")
        saved_deployments.append({"slug": item["slug"], "path": str(target_path)})

    model_restore = enqueue_model_backup_restore(snapshot.get("models") if isinstance(snapshot, dict) else {})

    restore_result = {
        "status": "staged",
        "saved_deployments": saved_deployments,
        "recipes_to_install": preview["installable_recipes"],
        "missing_recipes": preview["missing_recipes"],
        "model_restore": model_restore,
        "warnings": preview["warnings"],
    }

    restore_path = _backup_dir() / "nvidia-ai-hub-restore-last.json"
    restore_path.write_text(json.dumps(restore_result, indent=2), encoding="utf-8")
    restore_result["path"] = str(restore_path)
    return restore_result


def get_backup_restore_job(job_id: str) -> dict | None:
    return _restore_jobs.get(job_id)


def _append_job_log(job: dict, message: str) -> None:
    job.setdefault("logs", []).append(message)


def _recipe_steps(job: dict) -> list[dict]:
    steps = job.get("recipe_steps")
    if isinstance(steps, list):
        return steps
    job["recipe_steps"] = []
    return job["recipe_steps"]


def _ollama_steps(job: dict) -> list[dict]:
    steps = job.get("ollama_steps")
    if isinstance(steps, list):
        return steps
    job["ollama_steps"] = []
    return job["ollama_steps"]


def _upsert_step(steps: list[dict], key: str, payload: dict) -> dict:
    for item in steps:
        if str(item.get("key") or "") == key:
            item.update(payload)
            return item
    item = {"key": key, **payload}
    steps.append(item)
    return item


def _set_recipe_step(job: dict, slug: str, phase: str, status: str, details: str = "") -> None:
    _upsert_step(
        _recipe_steps(job),
        slug,
        {
            "slug": slug,
            "phase": phase,
            "status": status,
            "details": details,
            "updated_at": _utc_now(),
        },
    )


def _set_ollama_step(job: dict, name: str, status: str, details: str = "") -> None:
    _upsert_step(
        _ollama_steps(job),
        name,
        {
            "name": name,
            "status": status,
            "details": details,
            "updated_at": _utc_now(),
        },
    )


def _ensure_progress(job: dict) -> None:
    staged = job.get("staged") if isinstance(job.get("staged"), dict) else {}
    ollama_models = list((staged.get("model_restore") or {}).get("ollama_missing_models", []))
    job["recipes_total"] = int(job.get("recipes_total") or len(staged.get("recipes_to_install", [])))
    job["recipes_completed"] = int(job.get("recipes_completed") or 0)
    job["ollama_total"] = int(job.get("ollama_total") or len(ollama_models))
    job["ollama_completed"] = int(job.get("ollama_completed") or 0)
    job["ollama_failed"] = list(job.get("ollama_failed") or [])
    total_steps = job["recipes_total"] + job["ollama_total"]
    completed_steps = job["recipes_completed"] + job["ollama_completed"]
    job["progress_total"] = total_steps
    job["progress_completed"] = completed_steps
    job["progress_percent"] = int((completed_steps / total_steps) * 100) if total_steps > 0 else 100


def _mark_job_status(job: dict, status: str) -> None:
    job["status"] = status
    job["updated_at"] = _utc_now()
    _ensure_progress(job)
    _persist_restore_job(job)


async def _pull_ollama_model(name: str) -> dict:
    recipe = get_recipe("ollama-runtime")
    recipe_dir = get_recipe_dir("ollama-runtime")
    if not recipe or not recipe_dir:
        raise RuntimeError("Ollama Runtime recipe is not available")
    if recipe_dir and (recipe_dir / ".env").is_file():
        env_source = recipe_dir / ".env"
    else:
        env_source = recipe_dir / ".env.example"

    ui_port = recipe.ui.port if recipe and recipe.ui and recipe.ui.port else 3014
    if env_source.is_file():
        for raw_line in env_source.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == "OLLAMA_UI_PORT":
                try:
                    ui_port = int(value.strip())
                except ValueError:
                    pass

    url = f"http://127.0.0.1:{ui_port}/api/models/pull"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json={"name": name}, timeout=aiohttp.ClientTimeout(total=1800)) as response:
            data = await response.json(content_type=None)
            if response.status >= 400:
                detail = data.get("detail") if isinstance(data, dict) else None
                raise RuntimeError(detail or f"Ollama pull failed: HTTP {response.status}")
            return data if isinstance(data, dict) else {"result": data}


async def _run_backup_restore_job(job: dict) -> None:
    staged = job.get("staged") if isinstance(job.get("staged"), dict) else {}
    _mark_job_status(job, "running")
    for item in staged.get("recipes_to_install", []):
        slug = item.get("slug")
        if not slug:
            continue
        recipe = get_recipe(slug)
        if not recipe:
            job["recipes_skipped"].append({"slug": slug, "reason": "Recipe no longer available"})
            _set_recipe_step(job, slug, "skipped", "skipped", "Recipe no longer available")
            _persist_restore_job(job)
            continue
        try:
            _append_job_log(job, f"[restore] Installing {slug}")
            _set_recipe_step(job, slug, "install", "running", "Installing recipe")
            _persist_restore_job(job)
            async for line in install_recipe(slug):
                if line:
                    _append_job_log(job, line)
                    _persist_restore_job(job)
            if item.get("running"):
                _append_job_log(job, f"[restore] Launching {slug}")
                _set_recipe_step(job, slug, "launch", "running", "Launching restored recipe")
                _persist_restore_job(job)
                result = await launch_recipe(slug)
                _append_job_log(job, f"[restore] Launch result for {slug}: {result}")
                _set_recipe_step(job, slug, "launch", "completed", str(result))
            else:
                _set_recipe_step(job, slug, "install", "completed", "Recipe installed")
            job["recipes_completed"] += 1
        except Exception as exc:  # noqa: BLE001
            job["recipes_failed"].append({"slug": slug, "error": str(exc)})
            _append_job_log(job, f"[restore][error] {slug}: {exc}")
            _set_recipe_step(job, slug, "failed", "failed", str(exc))
        finally:
            job["updated_at"] = _utc_now()
            _ensure_progress(job)
            _persist_restore_job(job)

    ollama_models = list((staged.get("model_restore") or {}).get("ollama_missing_models", []))
    restored_ollama = []
    for model_name in ollama_models:
        if model_name in set(job.get("ollama_restored_models") or []):
            continue
        try:
            _append_job_log(job, f"[restore] Pulling Ollama model {model_name}")
            _set_ollama_step(job, model_name, "running", "Pulling model via shared runtime")
            _persist_restore_job(job)
            result = await _pull_ollama_model(model_name)
            restored_ollama.append(model_name)
            job.setdefault("ollama_restored_models", []).append(model_name)
            job["ollama_completed"] += 1
            _append_job_log(job, f"[restore] Ollama model restored: {model_name} ({result.get('status') or 'ok'})")
            _set_ollama_step(job, model_name, "completed", str(result.get("status") or "ok"))
        except Exception as exc:  # noqa: BLE001
            job["ollama_failed"].append({"name": model_name, "error": str(exc)})
            job["recipes_failed"].append({"slug": f"ollama:{model_name}", "error": str(exc)})
            _append_job_log(job, f"[restore][error] ollama {model_name}: {exc}")
            _set_ollama_step(job, model_name, "failed", str(exc))
        finally:
            job["updated_at"] = _utc_now()
            _ensure_progress(job)
            _persist_restore_job(job)

    if restored_ollama:
        clear_ollama_restore_plan(restored_ollama)

    final_status = "completed" if not job["recipes_failed"] else "completed-with-errors"
    _mark_job_status(job, final_status)


async def start_backup_restore(snapshot: dict) -> dict:
    staged = await apply_backup_restore(snapshot)
    job_id = f"restore-{uuid4().hex[:10]}"
    job = {
        "job_id": job_id,
        "status": "queued",
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
        "logs": [],
        "recipes_total": len(staged.get("recipes_to_install", [])),
        "recipes_completed": 0,
        "recipes_failed": [],
        "recipes_skipped": list(staged.get("missing_recipes", [])),
        "recipe_steps": [
            {
                "key": item.get("slug"),
                "slug": item.get("slug"),
                "phase": "queued",
                "status": "queued",
                "details": "Waiting for restore execution",
                "updated_at": _utc_now(),
            }
            for item in staged.get("recipes_to_install", [])
            if item.get("slug")
        ],
        "ollama_failed": [],
        "ollama_restored_models": [],
        "ollama_steps": [
            {
                "key": name,
                "name": name,
                "status": "queued",
                "details": "Waiting for Ollama replay",
                "updated_at": _utc_now(),
            }
            for name in list((staged.get("model_restore") or {}).get("ollama_missing_models", []))
            if name
        ],
        "staged": staged,
    }
    _ensure_progress(job)
    _restore_jobs[job_id] = job
    _persist_restore_job(job)
    job["_task"] = asyncio.create_task(_run_backup_restore_job(job))
    return job


def resume_backup_restore_jobs() -> None:
    for job in _restore_jobs.values():
        _ensure_progress(job)
        if job.get("status") not in {"queued", "running"}:
            _persist_restore_job(job)
            continue
        if job.get("_task") and not job["_task"].done():
            continue
        _append_job_log(job, "[restore] Resuming job after backend restart")
        job["_task"] = asyncio.create_task(_run_backup_restore_job(job))
        _persist_restore_job(job)


def _read_json_if_exists(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


_restore_jobs.update(_load_restore_jobs())