from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from daemon.models.remote import RemoteSessionUpsert
from daemon.services.remote_session_service import (
    build_remote_launch_payload,
    delete_remote_session,
    get_remote_session,
    list_remote_sessions,
    terminal_manager,
    upsert_remote_session,
)

router = APIRouter(tags=["remote-sessions"])


@router.get("/api/remote-sessions")
async def list_sessions():
    sessions = await list_remote_sessions()
    return {"sessions": [session.model_dump() for session in sessions]}


@router.post("/api/remote-sessions")
async def save_session(body: RemoteSessionUpsert):
    session = await upsert_remote_session(body)
    return {
        "status": "saved",
        "session": session.model_dump(),
        "launch": build_remote_launch_payload(session),
    }


@router.delete("/api/remote-sessions/{session_id}")
async def remove_session(session_id: str):
    removed = await delete_remote_session(session_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Remote session not found")
    await terminal_manager.disconnect(session_id)
    return {"status": "deleted", "id": session_id}


@router.get("/api/remote-sessions/{session_id}/launch")
async def get_launch_payload(session_id: str):
    session = await get_remote_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Remote session not found")
    return {"session": session.model_dump(), "launch": build_remote_launch_payload(session)}


@router.websocket("/ws/remote-sessions/{session_id}")
async def remote_terminal_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = await get_remote_session(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Remote session not found"})
        await websocket.close(code=4404)
        return

    try:
        while True:
            raw_message = await websocket.receive_text()
            message = json.loads(raw_message)
            message_type = message.get("type")

            if message_type == "connect":
                await terminal_manager.connect(
                    websocket,
                    session,
                    password=message.get("password"),
                    cols=int(message.get("cols") or 120),
                    rows=int(message.get("rows") or 30),
                )
            elif message_type == "input":
                await terminal_manager.write_input(session_id, message.get("data") or "")
            elif message_type == "resize":
                await terminal_manager.resize(session_id, message.get("cols"), message.get("rows"))
            elif message_type == "disconnect":
                await terminal_manager.disconnect(session_id)
                await websocket.send_json({"type": "status", "state": "disconnected", "sessionId": session_id})
            else:
                await websocket.send_json({"type": "error", "message": f"Unsupported message type: {message_type}"})
    except WebSocketDisconnect:
        await terminal_manager.disconnect(session_id)
