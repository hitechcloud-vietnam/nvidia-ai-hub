from __future__ import annotations

from pathlib import Path

import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from daemon.services.docker_service import get_installed_slugs, get_pending, is_ready, is_recipe_running
from daemon.services.registry_service import get_recipe, get_recipe_dir, get_recipes


router = APIRouter(prefix="/api/models", tags=["models"])

OLLAMA_RUNTIME_SLUG = "ollama-runtime"


class ModelActionRequest(BaseModel):
    name: str


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
        dependent_recipes.append({
            "slug": recipe.slug,
            "name": recipe.name,
            "category": recipe.category,
        })
    dependent_recipes.sort(key=lambda item: item["name"].lower())

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
        "supports": {
            "browse": True,
            "download": True,
            "delete": True,
            "duplicate_prevention": True,
            "hugging_face": False,
            "ollama_registry": True,
        },
        "notes": [
            "This first P2.3 slice is powered by the shared Ollama Runtime recipe.",
            "Downloaded models are reused across Ollama-connected recipes through the shared runtime endpoint.",
            f"{len(dependent_recipes)} recipes currently declare a dependency on the shared Ollama runtime.",
        ],
    }


@router.get("/runtime")
async def models_runtime():
    return await _proxy_ollama_runtime("/api/runtime")


@router.get("/installed")
async def installed_models():
    return await _proxy_ollama_runtime("/api/models")


@router.get("/catalog")
async def model_catalog():
    return await _proxy_ollama_runtime("/api/catalog")


@router.get("/downloads")
async def model_downloads():
    return await _proxy_ollama_runtime("/api/downloads")


@router.post("/pull")
async def pull_model(body: ModelActionRequest):
    return await _proxy_ollama_runtime("/api/models/pull", method="POST", payload=body.model_dump())


@router.post("/delete")
async def delete_model(body: ModelActionRequest):
    return await _proxy_ollama_runtime("/api/models/delete", method="POST", payload=body.model_dump())