import asyncio
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

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
    mark_ready,
    clear_ready,
    is_ready,
    start_health_check,
    set_pending,
    clear_pending,
    ensure_runtime_env,
)
from daemon.services.registry_service import get_recipe, get_recipe_dir
from daemon.models.container import ContainerInfo

router = APIRouter(tags=["containers"])

# Track active build tasks: slug -> {"lines": [...], "done": bool}
_builds: dict[str, dict] = {}


@router.post("/api/recipes/{slug}/install")
async def install(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # If already building, return current status
    if slug in _builds and not _builds[slug]["done"]:
        return {"status": "building", "slug": slug}

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
    return {"status": "building", "slug": slug}


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
async def launch(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    set_pending(slug, "launching")
    clear_ready(slug)
    result = await launch_recipe(slug)
    if result == "launched":
        # Start background health check (will clear_pending when ready)
        await start_health_check(slug)
        return {"status": "launched", "slug": slug}
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


def _compose_file_for_slug(slug: str) -> Path:
    recipe_dir = get_recipe_dir(slug)
    if not recipe_dir:
        raise HTTPException(status_code=404, detail="Recipe not found")
    compose_file = recipe_dir / "docker-compose.yml"
    if not compose_file.is_file():
        raise HTTPException(status_code=404, detail="docker-compose.yml not found")
    return compose_file


def _get_default_compose_content(compose_file: Path) -> str:
    repo_root = compose_file.parents[3]
    rel_path = compose_file.relative_to(repo_root)
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
    if not template_file.is_file():
        raise HTTPException(status_code=404, detail="Default runtime env not available")

    repo_root = template_file.parents[3]
    rel_path = template_file.relative_to(repo_root)
    proc = subprocess.run(
        ["git", "show", f"HEAD:{rel_path.as_posix()}"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode == 0:
        return proc.stdout
    return template_file.read_text()


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
        container = await get_container_name(slug)
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

        proc = await asyncio.create_subprocess_exec(
            "docker", "logs", "-f", "--tail", "200", container,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        async for line in proc.stdout:
            text = line.decode(errors="replace").rstrip()
            # Handle carriage returns (progress bars): only keep last segment
            if '\r' in text:
                text = text.rsplit('\r', 1)[-1]
            if text:
                await websocket.send_text(text)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        if health_task and not health_task.done():
            health_task.cancel()
        if proc and proc.returncode is None:
            proc.kill()
            await proc.wait()
