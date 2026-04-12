import asyncio
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from daemon.models.container import SystemMetrics
from daemon.services.monitor_service import get_system_metrics

router = APIRouter(tags=["system"])

_HF_TOKEN_PATH = Path.home() / ".cache" / "huggingface" / "token"


@router.get("/api/system/hf-token")
async def get_hf_token():
    """Check if a HuggingFace token is configured."""
    return {"has_token": _HF_TOKEN_PATH.is_file() and _HF_TOKEN_PATH.read_text().strip() != ""}


class HFTokenBody(BaseModel):
    token: str


@router.post("/api/system/hf-token")
async def set_hf_token(body: HFTokenBody):
    """Save a HuggingFace token."""
    _HF_TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    _HF_TOKEN_PATH.write_text(body.token.strip())
    return {"status": "saved"}


@router.get("/api/system/metrics", response_model=SystemMetrics)
async def metrics():
    return await get_system_metrics()


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
