from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

from daemon.config import settings


def _utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def _read_json(path: Path, fallback):
    if not path.is_file():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def _hf_queue_path() -> Path:
    return settings.data_dir / "hf-model-intake-queue.json"


def _hf_storage_root() -> Path:
    return settings.data_dir / "models" / "huggingface"


def _list_hf_snapshots() -> list[dict]:
    root = _hf_storage_root()
    if not root.is_dir():
        return []
    snapshots = []
    for target_dir in sorted([child for child in root.iterdir() if child.is_dir()], key=lambda item: item.name.lower()):
        for repo_dir in sorted([child for child in target_dir.iterdir() if child.is_dir()], key=lambda item: item.name.lower()):
            snapshots.append(
                {
                    "repository": repo_dir.name.replace("--", "/"),
                    "target_dir": target_dir.name,
                    "path": str(repo_dir),
                }
            )
    return snapshots


def build_model_backup_snapshot() -> dict:
    queue = _read_json(_hf_queue_path(), [])
    installed_models = []
    model_inventory = settings.data_dir / "models" / "ollama-installed.json"
    inventory = _read_json(model_inventory, {})
    if isinstance(inventory, dict):
        raw_models = inventory.get("models") or []
        if isinstance(raw_models, list):
            installed_models = [str(item.get("name") or "").strip() for item in raw_models if isinstance(item, dict) and str(item.get("name") or "").strip()]

    return {
        "ollama_models": sorted(set(installed_models)),
        "huggingface_snapshots": _list_hf_snapshots(),
        "huggingface_queue": queue if isinstance(queue, list) else [],
    }


def diff_model_backup_snapshot(models_snapshot: dict) -> dict:
    current = build_model_backup_snapshot()
    backup_ollama = set(str(item).strip() for item in (models_snapshot or {}).get("ollama_models", []) if str(item).strip())
    current_ollama = set(current.get("ollama_models", []))

    def _hf_key(item: dict) -> str:
        return f"{item.get('target_dir', 'huggingface')}::{item.get('repository', '')}"

    backup_hf = {_hf_key(item): item for item in ((models_snapshot or {}).get("huggingface_snapshots", []) or []) if isinstance(item, dict)}
    current_hf = {_hf_key(item): item for item in (current.get("huggingface_snapshots", []) or []) if isinstance(item, dict)}

    return {
        "ollama_missing": sorted(backup_ollama - current_ollama),
        "ollama_present": sorted(backup_ollama & current_ollama),
        "ollama_missing_count": len(backup_ollama - current_ollama),
        "huggingface_missing": [backup_hf[key] for key in sorted(set(backup_hf) - set(current_hf))],
        "huggingface_present": [backup_hf[key] for key in sorted(set(backup_hf) & set(current_hf))],
        "huggingface_missing_count": len(set(backup_hf) - set(current_hf)),
    }


def enqueue_model_backup_restore(models_snapshot: dict) -> dict:
    diff = diff_model_backup_snapshot(models_snapshot or {})
    queue_path = _hf_queue_path()
    queue_items = _read_json(queue_path, [])
    if not isinstance(queue_items, list):
        queue_items = []

    existing_keys = {
        f"{str(item.get('repository') or '').lower()}::{str(item.get('revision') or 'main').lower()}::{str(item.get('target_dir') or 'huggingface').lower()}"
        for item in queue_items
        if isinstance(item, dict)
    }

    queued = []
    for item in diff.get("huggingface_missing", []):
        repository = str(item.get("repository") or "").strip()
        target_dir = str(item.get("target_dir") or "huggingface").strip() or "huggingface"
        if not repository:
            continue
        key = f"{repository.lower()}::main::{target_dir.lower()}"
        if key in existing_keys:
            continue
        queue_item = {
            "id": f"hf-restore-{abs(hash((repository, target_dir, len(queue_items))))}",
            "repository": repository,
            "revision": "main",
            "target_dir": target_dir,
            "notes": "Queued from backup restore manifest",
            "status": "queued",
            "progress": 0,
            "message": "Queued from backup restore manifest",
            "created_at": _utc_now(),
            "source": "backup-restore",
        }
        queue_items.insert(0, queue_item)
        existing_keys.add(key)
        queued.append(queue_item)

    queue_path.parent.mkdir(parents=True, exist_ok=True)
    queue_path.write_text(json.dumps(queue_items, indent=2), encoding="utf-8")

    restore_plan_path = settings.data_dir / "models" / "ollama-restore-plan.json"
    restore_plan_path.parent.mkdir(parents=True, exist_ok=True)
    restore_plan = {
        "created_at": _utc_now(),
        "missing_models": diff.get("ollama_missing", []),
    }
    restore_plan_path.write_text(json.dumps(restore_plan, indent=2), encoding="utf-8")

    return {
        "queued_huggingface": queued,
        "queued_huggingface_count": len(queued),
        "ollama_restore_plan_path": str(restore_plan_path),
        "ollama_missing_models": diff.get("ollama_missing", []),
    }


def get_ollama_restore_plan() -> dict:
    restore_plan_path = settings.data_dir / "models" / "ollama-restore-plan.json"
    data = _read_json(restore_plan_path, {})
    return data if isinstance(data, dict) else {}


def clear_ollama_restore_plan(models: list[str]) -> dict:
    restore_plan_path = settings.data_dir / "models" / "ollama-restore-plan.json"
    data = get_ollama_restore_plan()
    missing = data.get("missing_models") if isinstance(data, dict) else []
    if not isinstance(missing, list):
        missing = []
    completed = {str(item).strip() for item in models if str(item).strip()}
    remaining = [item for item in missing if str(item).strip() not in completed]
    updated = {
        "created_at": data.get("created_at") if isinstance(data, dict) else _utc_now(),
        "updated_at": _utc_now(),
        "missing_models": remaining,
        "restored_models": sorted(completed),
    }
    restore_plan_path.parent.mkdir(parents=True, exist_ok=True)
    restore_plan_path.write_text(json.dumps(updated, indent=2), encoding="utf-8")
    return updated