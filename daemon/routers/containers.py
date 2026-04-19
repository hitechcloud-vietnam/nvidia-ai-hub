import asyncio
import subprocess
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pydantic import BaseModel

from daemon.config import settings
from daemon.services.docker_service import (
    install_recipe,
    update_recipe,
    launch_recipe,
    stop_recipe,
    restart_recipe,
    remove_recipe,
    purge_recipe,
    get_running_containers,
    get_container_name,
    stream_container_logs,
    exec_container_command,
    mark_ready,
    clear_ready,
    is_ready,
    start_health_check,
    set_pending,
    clear_pending,
    ensure_runtime_env,
)
from daemon.models.container import DeploymentSelection
from daemon.services.registry_service import get_recipe, get_recipe_dir, get_registry_recipe_dir
from daemon.services.deployment_service import apply_recipe_deployment_selection, get_recipe_deployment_selection
from daemon.services.fork_service import (
    activate_recipe_fork,
    build_recipe_fork_manifest_markdown_summary,
    deactivate_recipe_fork,
    delete_recipe_fork,
    export_recipe_fork_bundle,
    get_recipe_fork_full_diff,
    get_recipe_fork_diff_summary,
    get_recipe_fork_status,
    save_recipe_fork,
)
from daemon.models.container import ContainerInfo

router = APIRouter(tags=["containers"])

# Track active build tasks: slug -> {"lines": [...], "done": bool}
_builds: dict[str, dict] = {}


@router.post("/api/recipes/{slug}/install")
async def install(slug: str, body: DeploymentSelection | None = None):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    selection_payload = None
    if body is not None:
        try:
            selection_payload = apply_recipe_deployment_selection(slug, body)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    # If already building, return current status
    if slug in _builds and not _builds[slug]["done"]:
        return {"status": "building", "slug": slug, "deployment_selection": selection_payload}

    set_pending(slug, "installing")
    clear_ready(slug)
    _builds[slug] = {"lines": [], "done": False}

    async def _run_build():
        try:
            async for line in install_recipe(slug):
                _builds[slug]["lines"].append(line)
        except Exception as e:
            _builds[slug]["lines"].append(f"[error] {e}")
        finally:
            _builds[slug]["done"] = True
            clear_pending(slug)

    asyncio.create_task(_run_build())
    return {"status": "building", "slug": slug, "deployment_selection": selection_payload}


@router.post("/api/recipes/{slug}/update")
async def update(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    clear_ready(slug)

    if slug in _builds and not _builds[slug]["done"]:
        return {"status": "building", "slug": slug}

    _builds[slug] = {"lines": [], "done": False}

    async def _run_update():
        try:
            async for line in update_recipe(slug):
                _builds[slug]["lines"].append(line)
        except Exception as e:
            _builds[slug]["lines"].append(f"[error] {e}")
        finally:
            _builds[slug]["done"] = True

    asyncio.create_task(_run_update())
    return {"status": "building", "slug": slug}


@router.get("/api/recipes/{slug}/build-status")
async def build_status(slug: str):
    build = _builds.get(slug)
    if not build:
        return {"status": "idle", "lines": []}
    return {
        "status": "done" if build["done"] else "building",
        "lines": build["lines"],
    }


@router.post("/api/recipes/{slug}/launch")
async def launch(slug: str, body: DeploymentSelection | None = None):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    selection_payload = None
    if body is not None:
        try:
            selection_payload = apply_recipe_deployment_selection(slug, body)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
    set_pending(slug, "launching")
    clear_ready(slug)
    result = await launch_recipe(slug)
    if result == "launched":
        # Start background health check (will clear_pending when ready)
        await start_health_check(slug)
        return {"status": "launched", "slug": slug, "deployment_selection": selection_payload}
    clear_pending(slug)
    raise HTTPException(status_code=500, detail=result)


@router.post("/api/recipes/{slug}/stop")
async def stop(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    set_pending(slug, "stopping")
    clear_ready(slug)
    result = await stop_recipe(slug)
    clear_pending(slug)
    return {"status": result, "slug": slug}


@router.post("/api/recipes/{slug}/restart")
async def restart(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    set_pending(slug, "launching")
    clear_ready(slug)
    result = await restart_recipe(slug)
    if result == "restarted":
        await start_health_check(slug)
        return {"status": result, "slug": slug}
    clear_pending(slug)
    raise HTTPException(status_code=500, detail=result)


@router.delete("/api/recipes/{slug}")
async def remove(slug: str, delete_data: bool = True):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    set_pending(slug, "removing")
    clear_ready(slug)
    result = await remove_recipe(slug, delete_data=delete_data)
    clear_pending(slug)
    return {"status": result, "slug": slug}


@router.post("/api/recipes/{slug}/purge")
async def purge(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    result = await purge_recipe(slug)
    return {"status": result, "slug": slug}


class ComposeBody(BaseModel):
    content: str


class EnvBody(BaseModel):
    content: str


class ExecBody(BaseModel):
    command: str


class ForkBody(BaseModel):
    compose_content: str | None = None


@router.get("/api/recipes/{slug}/deployment-selection")
async def get_deployment_selection(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    selection = get_recipe_deployment_selection(slug)
    return {"slug": slug, "selection": selection.model_dump() if selection else None}


@router.post("/api/recipes/{slug}/deployment-selection")
async def save_deployment_selection(slug: str, body: DeploymentSelection):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        result = apply_recipe_deployment_selection(slug, body)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "saved", "slug": slug, **result}


@router.post("/api/recipes/{slug}/fork")
async def save_fork(slug: str, body: ForkBody | None = None):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        result = save_recipe_fork(slug, compose_content=body.compose_content if body else None)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "saved", **result}


@router.post("/api/recipes/{slug}/fork/activate")
async def activate_fork(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        result = activate_recipe_fork(slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "activated", **result}


@router.post("/api/recipes/{slug}/fork/deactivate")
async def deactivate_fork(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        result = deactivate_recipe_fork(slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "deactivated", **result}


@router.delete("/api/recipes/{slug}/fork")
async def delete_fork(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        result = delete_recipe_fork(slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "deleted", **result}


@router.post("/api/recipes/{slug}/fork/export")
async def export_fork_bundle(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        result = await export_recipe_fork_bundle(slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "exported", **result}


@router.post("/api/recipes/{slug}/fork/open-bundle-dir")
async def open_fork_bundle_dir(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    bundle_dir = settings.fork_bundles_path / slug
    if not bundle_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Bundle directory not found: {bundle_dir}")

    try:
        if sys.platform.startswith("win"):
            subprocess.Popen(["explorer", str(bundle_dir)])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(bundle_dir)])
        else:
            subprocess.Popen(["xdg-open", str(bundle_dir)])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to open bundle directory: {exc}") from exc

    return {"status": "opened", "slug": slug, "bundle_dir": str(bundle_dir)}


@router.get("/api/recipes/{slug}/fork/diff")
async def get_fork_diff(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        return get_recipe_fork_diff_summary(slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/api/recipes/{slug}/fork/diff/full")
async def get_fork_full_diff(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        return get_recipe_fork_full_diff(slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/api/recipes/{slug}/fork/manifest-markdown")
async def get_fork_manifest_markdown(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        return {"slug": slug, "markdown": build_recipe_fork_manifest_markdown_summary(slug)}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/api/recipes/{slug}/fork/manifest-markdown/download")
async def download_fork_manifest_markdown(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        markdown = build_recipe_fork_manifest_markdown_summary(slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    output_dir = settings.fork_bundles_path / slug
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{slug}-fork-summary.md"
    output_path.write_text(markdown, encoding="utf-8")
    return FileResponse(
        path=output_path,
        media_type="text/markdown; charset=utf-8",
        filename=output_path.name,
    )


@router.get("/api/recipes/{slug}/fork/download")
async def download_fork_bundle(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    try:
        result = await export_recipe_fork_bundle(slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    bundle_path = Path(result["bundle_path"])
    if not bundle_path.is_file():
        raise HTTPException(status_code=404, detail="Bundle file not found")

    return FileResponse(
        path=bundle_path,
        media_type="application/zip",
        filename=bundle_path.name,
    )


def _compose_file_for_slug(slug: str) -> Path:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        raise HTTPException(status_code=404, detail="Recipe not found")
    compose_file = recipe_dir / "docker-compose.yml"
    if not compose_file.is_file():
        raise HTTPException(status_code=404, detail="docker-compose.yml not found")
    return compose_file


def _get_default_compose_content(compose_file: Path) -> str:
    slug = compose_file.parent.name
    registry_recipe_dir = get_registry_recipe_dir(slug)
    if not registry_recipe_dir:
        raise HTTPException(status_code=404, detail="Default docker-compose.yml not available")
    repo_root = settings.base_dir
    rel_path = (registry_recipe_dir / compose_file.name).relative_to(repo_root)
    proc = subprocess.run(
        ["git", "show", f"HEAD:{rel_path.as_posix()}"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise HTTPException(status_code=404, detail="Default docker-compose.yml not available")
    return proc.stdout


def _env_paths_for_slug(slug: str) -> tuple[Path, Path, Path]:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        raise HTTPException(status_code=404, detail="Recipe not found")

    env_file = recipe_dir / ".env"
    template_file = recipe_dir / ".env.example"
    if not env_file.is_file() and not template_file.is_file():
        raise HTTPException(status_code=404, detail="Runtime env not available")
    return recipe_dir, env_file, template_file


def _get_default_env_content(template_file: Path) -> str:
    slug = template_file.parent.name
    registry_recipe_dir = get_registry_recipe_dir(slug)
    registry_template_file = registry_recipe_dir / template_file.name if registry_recipe_dir else None
    if not registry_template_file or not registry_template_file.is_file():
        raise HTTPException(status_code=404, detail="Default runtime env not available")

    repo_root = settings.base_dir
    rel_path = registry_template_file.relative_to(repo_root)
    proc = subprocess.run(
        ["git", "show", f"HEAD:{rel_path.as_posix()}"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode == 0:
        return proc.stdout
    return registry_template_file.read_text()


@router.get("/api/recipes/{slug}/compose")
async def get_compose(slug: str):
    compose_file = _compose_file_for_slug(slug)
    content = compose_file.read_text()
    try:
        default_content = _get_default_compose_content(compose_file)
    except HTTPException:
        default_content = content
    return {
        "content": content,
        "default_content": default_content,
    }


@router.put("/api/recipes/{slug}/compose")
async def put_compose(slug: str, body: ComposeBody):
    compose_file = _compose_file_for_slug(slug)
    compose_file.write_text(body.content)
    return {"status": "saved"}


@router.post("/api/recipes/{slug}/compose/reset")
async def reset_compose(slug: str):
    compose_file = _compose_file_for_slug(slug)
    default_content = _get_default_compose_content(compose_file)
    compose_file.write_text(default_content)
    return {
        "status": "reset",
        "content": default_content,
    }


@router.get("/api/recipes/{slug}/env")
async def get_runtime_env(slug: str):
    recipe_dir, env_file, template_file = _env_paths_for_slug(slug)

    ensured_env_file, _ = ensure_runtime_env(recipe_dir)
    if ensured_env_file and ensured_env_file.is_file():
        env_file = ensured_env_file

    if not env_file.is_file():
        raise HTTPException(status_code=404, detail="Runtime env file not available")

    try:
        default_content = _get_default_env_content(template_file)
    except HTTPException:
        default_content = env_file.read_text()

    return {
        "content": env_file.read_text(),
        "default_content": default_content,
        "path": str(env_file),
    }


@router.put("/api/recipes/{slug}/env")
async def put_runtime_env(slug: str, body: EnvBody):
    recipe_dir, env_file, _ = _env_paths_for_slug(slug)
    if not env_file.is_file():
        ensured_env_file, _ = ensure_runtime_env(recipe_dir)
        if ensured_env_file and ensured_env_file.is_file():
            env_file = ensured_env_file
    env_file.write_text(body.content)
    return {"status": "saved"}


@router.post("/api/recipes/{slug}/env/reset")
async def reset_runtime_env(slug: str):
    recipe_dir, env_file, template_file = _env_paths_for_slug(slug)
    if not env_file.is_file():
        ensured_env_file, _ = ensure_runtime_env(recipe_dir)
        if ensured_env_file and ensured_env_file.is_file():
            env_file = ensured_env_file

    default_content = _get_default_env_content(template_file)
    env_file.write_text(default_content)
    return {
        "status": "reset",
        "content": default_content,
        "path": str(env_file),
    }


@router.get("/api/containers", response_model=list[ContainerInfo])
async def list_containers():
    return await get_running_containers()


@router.websocket("/ws/build/{slug}")
async def build_log_ws(websocket: WebSocket, slug: str):
    await websocket.accept()
    seen = 0
    try:
        # Wait for the build to exist (it may not have started yet)
        for _ in range(50):  # up to 5 seconds
            if slug in _builds:
                break
            await asyncio.sleep(0.1)

        while True:
            build = _builds.get(slug)
            if not build:
                await asyncio.sleep(0.3)
                continue

            lines = build["lines"]
            while seen < len(lines):
                await websocket.send_text(lines[seen])
                seen += 1

            if build["done"]:
                await websocket.send_text("[done]")
                await websocket.close()
                return

            await asyncio.sleep(0.3)
    except (WebSocketDisconnect, RuntimeError):
        pass


@router.websocket("/ws/logs/{slug}")
async def container_log_ws(websocket: WebSocket, slug: str):
    await websocket.accept()
    proc = None
    health_task = None
    try:
        container = None
        for _ in range(20):
            container = await get_container_name(slug)
            if container:
                break
            await asyncio.sleep(0.5)

        if not container:
            await websocket.send_text("[nvidia-ai-hub] Container not running")
            await websocket.close()
            return

        # Start health check alongside log streaming
        await start_health_check(slug)

        async def _notify_when_ready():
            for _ in range(600):  # up to 10 minutes
                if is_ready(slug):
                    await websocket.send_text("[nvidia-ai-hub:ready]")
                    return
                await asyncio.sleep(1)

        health_task = asyncio.create_task(_notify_when_ready())

        async for text in stream_container_logs(container):
            await websocket.send_text(text)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        if health_task and not health_task.done():
            health_task.cancel()


@router.post("/api/recipes/{slug}/exec")
async def exec_in_container(slug: str, body: ExecBody):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    command = (body.command or "").strip()
    if not command:
        raise HTTPException(status_code=400, detail="Command is required")

    container = await get_container_name(slug)
    if not container:
        raise HTTPException(status_code=409, detail="Container not running")

    lines: list[str] = []
    exit_code = 0
    async for text, code in exec_container_command(container, command):
        if text:
            lines.append(text)
        if code is not None:
            exit_code = code

    return {
        "slug": slug,
        "container": container,
        "command": command,
        "exit_code": exit_code,
        "lines": lines,
    }
