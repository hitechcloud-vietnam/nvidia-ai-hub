from __future__ import annotations

import json
import time
from pathlib import Path

from daemon.config import settings
from daemon.models.container import DeploymentSelection
from daemon.services.docker_service import ensure_runtime_env
from daemon.services.registry_service import get_recipe_dir


def _deployment_dir(slug: str) -> Path:
    path = settings.deployments_path / slug
    path.mkdir(parents=True, exist_ok=True)
    return path


def _deployment_path(slug: str) -> Path:
    return _deployment_dir(slug) / "selection.json"


def get_recipe_deployment_selection(slug: str) -> DeploymentSelection | None:
    path = _deployment_path(slug)
    if not path.is_file():
        return None
    try:
        return DeploymentSelection(**json.loads(path.read_text(encoding="utf-8")))
    except Exception:
        return None


def save_recipe_deployment_selection(slug: str, selection: DeploymentSelection) -> DeploymentSelection:
    payload = selection.model_copy(update={"updated_at": int(time.time())})
    _deployment_path(slug).write_text(json.dumps(payload.model_dump(), indent=2), encoding="utf-8")
    return payload


def apply_recipe_deployment_selection(slug: str, selection: DeploymentSelection) -> dict[str, object]:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        raise FileNotFoundError(f"Recipe directory not found for {slug}")

    env_file, _ = ensure_runtime_env(recipe_dir)
    if env_file is None:
        env_file = recipe_dir / ".env"

    existing = env_file.read_text(encoding="utf-8") if env_file.is_file() else ""
    marker = "# NVIDIA AI Hub deployment profile"
    managed_block = "\n".join([
        marker,
        f"NVIDIA_AI_HUB_DEPLOYMENT_PROFILE={selection.profile}",
        f"NVIDIA_AI_HUB_DEPLOYMENT_STRATEGY={selection.strategy}",
        f"NVIDIA_AI_HUB_TARGET_GPUS={','.join(str(index) for index in selection.target_gpu_indices)}",
        f"NVIDIA_AI_HUB_TARGET_HOSTS={','.join(selection.target_hosts)}",
        f"NVIDIA_AI_HUB_SHARED_STORAGE_PATH={selection.shared_storage_path}",
        f"NVIDIA_AI_HUB_DEPLOYMENT_NOTES={selection.notes}",
    ])

    lines = existing.splitlines()
    if marker in lines:
        existing = "\n".join(lines[:lines.index(marker)]).rstrip()

    updated = f"{existing}\n\n{managed_block}\n" if existing.strip() else f"{managed_block}\n"
    env_file.write_text(updated, encoding="utf-8")

    saved = save_recipe_deployment_selection(slug, selection)
    return {
        "selection": saved.model_dump(),
        "path": str(env_file),
    }