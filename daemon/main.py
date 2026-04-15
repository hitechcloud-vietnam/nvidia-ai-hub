import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from daemon.config import settings
from daemon.db import init_db
from daemon.routers import recipes, containers, system
from daemon.services.registry_service import load_recipes, get_recipes
from daemon.services.docker_service import is_recipe_running, start_health_check

DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


async def _check_running_readiness():
    """On startup, probe already-running recipes so ready cache is warm."""
    await asyncio.sleep(2)  # let everything initialize
    for slug in get_recipes().keys():
        if await is_recipe_running(slug):
            await start_health_check(slug)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    load_recipes()
    asyncio.create_task(_check_running_readiness())
    yield


app = FastAPI(title="NVIDIA AI Hub", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API and WebSocket routers first — order matters
app.include_router(recipes.router)
app.include_router(containers.router)
app.include_router(system.router)

# Serve static assets (js, css, etc.) under /assets
if DIST_DIR.is_dir():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Try to serve the exact file first
        file_path = DIST_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        # Fall back to index.html for SPA routing
        index = DIST_DIR / "index.html"
        if index.is_file():
            return FileResponse(index)
        return Response(status_code=404)
