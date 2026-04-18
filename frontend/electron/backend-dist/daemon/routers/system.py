import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from daemon.models.container import DeploymentPlan, GpuTopologySnapshot, RecipeMetrics, SystemMetrics
from daemon.services.backup_service import apply_backup_restore, build_backup_snapshot, get_backup_restore_job, preview_backup_restore, start_backup_restore
from daemon.services.deployment_service import get_recipe_deployment_selection
from daemon.services.monitor_service import get_gpu_topology_snapshot, get_recipe_deployment_plan, get_recipe_metrics, get_system_metrics
from daemon.services.registry_service import get_recipe

router = APIRouter(tags=["system"])

_HF_TOKEN_PATH = Path.home() / ".cache" / "huggingface" / "token"


@router.get("/api/system/hf-token")
async def get_hf_token():
    """Check if a HuggingFace token is configured."""
    return {"has_token": _HF_TOKEN_PATH.is_file() and _HF_TOKEN_PATH.read_text().strip() != ""}


class HFTokenBody(BaseModel):
    token: str


class BackupRestoreBody(BaseModel):
    snapshot: dict


@router.post("/api/system/hf-token")
async def set_hf_token(body: HFTokenBody):
    """Save a HuggingFace token."""
    _HF_TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    _HF_TOKEN_PATH.write_text(body.token.strip())
    return {"status": "saved"}


@router.get("/api/system/metrics", response_model=SystemMetrics)
async def metrics():
    return await get_system_metrics()


@router.get("/api/system/recipe-metrics", response_model=dict[str, RecipeMetrics])
async def recipe_metrics():
    return await get_recipe_metrics()


@router.get("/api/system/topology", response_model=GpuTopologySnapshot)
async def topology():
    metrics = await get_system_metrics()
    return await get_gpu_topology_snapshot(metrics)


@router.get("/api/system/deployment-plan/{slug}", response_model=DeploymentPlan)
async def deployment_plan(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        return DeploymentPlan(slug=slug)
    return await get_recipe_deployment_plan(recipe, get_recipe_deployment_selection(slug))


@router.post("/api/system/backup/export")
async def export_backup():
    result = await build_backup_snapshot()
    return {"status": "exported", **result}


@router.post("/api/system/backup/preview")
async def preview_backup(body: BackupRestoreBody):
    if not isinstance(body.snapshot, dict):
        raise HTTPException(status_code=400, detail="Backup snapshot payload must be an object")
    return preview_backup_restore(body.snapshot)


@router.post("/api/system/backup/restore")
async def restore_backup(body: BackupRestoreBody):
    if not isinstance(body.snapshot, dict):
        raise HTTPException(status_code=400, detail="Backup snapshot payload must be an object")
    result = await apply_backup_restore(body.snapshot)
    return result


@router.post("/api/system/backup/restore/start")
async def start_restore_backup(body: BackupRestoreBody):
    if not isinstance(body.snapshot, dict):
        raise HTTPException(status_code=400, detail="Backup snapshot payload must be an object")
    return await start_backup_restore(body.snapshot)


@router.get("/api/system/backup/restore/{job_id}")
async def get_restore_backup_job(job_id: str):
    job = get_backup_restore_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Restore job not found")
    return job


@router.websocket("/ws/metrics")
async def metrics_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            m = await get_system_metrics()
            await websocket.send_json(m.model_dump())
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass


@router.websocket("/ws/recipe-metrics")
async def recipe_metrics_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            metrics = await get_recipe_metrics()
            await websocket.send_json({slug: metric.model_dump() for slug, metric in metrics.items()})
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
