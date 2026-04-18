from __future__ import annotations

import shutil
from pathlib import Path

from daemon.config import settings
from daemon.services.registry_service import get_recipe_dir


def _fork_dir(slug: str) -> Path:
    path = settings.forks_path / slug
    path.mkdir(parents=True, exist_ok=True)
    return path


def _copy_if_exists(source: Path, destination: Path) -> bool:
    if not source.is_file():
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    return True


def save_recipe_fork(slug: str) -> dict:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        raise FileNotFoundError(f"Recipe not found: {slug}")

    fork_dir = _fork_dir(slug)
    compose_source = recipe_dir / "docker-compose.yml"
    env_source = recipe_dir / ".env"
    env_template = recipe_dir / ".env.example"
    recipe_source = recipe_dir / "recipe.yaml"

    compose_saved = _copy_if_exists(compose_source, fork_dir / "docker-compose.yml")
    recipe_saved = _copy_if_exists(recipe_source, fork_dir / "recipe.yaml")
    env_saved = _copy_if_exists(env_source if env_source.is_file() else env_template, fork_dir / ".env")

    return {
        "slug": slug,
        "fork_dir": str(fork_dir),
        "files": {
            "recipe": recipe_saved,
            "compose": compose_saved,
            "env": env_saved,
        },
    }


def get_recipe_fork_status(slug: str) -> dict:
    fork_dir = settings.forks_path / slug
    return {
        "slug": slug,
        "exists": fork_dir.is_dir(),
        "fork_dir": str(fork_dir),
        "files": {
            "recipe": (fork_dir / "recipe.yaml").is_file(),
            "compose": (fork_dir / "docker-compose.yml").is_file(),
            "env": (fork_dir / ".env").is_file(),
        },
    }