from __future__ import annotations

import asyncio
import contextlib
import json
import os
import shlex
import shutil
import signal
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import WebSocket

from daemon.db import get_db
from daemon.models.remote import RemoteSessionRecord, RemoteSessionUpsert

DEFAULT_PORTS = {
    "ssh": 22,
    "sftp": 22,
    "rdp": 3389,
    "vnc": 5900,
    "http": 80,
    "https": 443,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_session(payload: RemoteSessionUpsert) -> RemoteSessionRecord:
    session_id = payload.id or f"remote-{uuid4().hex}"
    now = _now_iso()
    return RemoteSessionRecord(
        id=session_id,
        name=payload.name.strip(),
        protocol=payload.protocol,
        host=payload.host.strip(),
        port=payload.port or DEFAULT_PORTS.get(payload.protocol),
        username=payload.username.strip(),
        remote_path=payload.remote_path.strip(),
        description=payload.description.strip(),
        password_hint=payload.password_hint.strip(),
        created_at=now,
        updated_at=now,
    )


async def list_remote_sessions() -> list[RemoteSessionRecord]:
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            """
            SELECT id, name, protocol, host, port, username, remote_path, description, password_hint, created_at, updated_at
            FROM remote_sessions
            ORDER BY updated_at DESC, created_at DESC
            """
        )
    finally:
        await db.close()
    return [RemoteSessionRecord(**dict(row)) for row in rows]


async def get_remote_session(session_id: str) -> RemoteSessionRecord | None:
    db = await get_db()
    try:
        row = await db.execute_fetchone(
            """
            SELECT id, name, protocol, host, port, username, remote_path, description, password_hint, created_at, updated_at
            FROM remote_sessions
            WHERE id = ?
            """,
            (session_id,),
        )
    finally:
        await db.close()
    return RemoteSessionRecord(**dict(row)) if row else None


async def upsert_remote_session(payload: RemoteSessionUpsert) -> RemoteSessionRecord:
    existing = await get_remote_session(payload.id) if payload.id else None
    normalized = normalize_session(payload)
    if existing:
        normalized = RemoteSessionRecord(
            **{
                **normalized.model_dump(),
                "created_at": existing.created_at,
                "updated_at": _now_iso(),
            }
        )

    db = await get_db()
    try:
        await db.execute(
            """
            INSERT INTO remote_sessions (id, name, protocol, host, port, username, remote_path, description, password_hint, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                protocol = excluded.protocol,
                host = excluded.host,
                port = excluded.port,
                username = excluded.username,
                remote_path = excluded.remote_path,
                description = excluded.description,
                password_hint = excluded.password_hint,
                updated_at = excluded.updated_at
            """,
            (
                normalized.id,
                normalized.name,
                normalized.protocol,
                normalized.host,
                normalized.port,
                normalized.username,
                normalized.remote_path,
                normalized.description,
                normalized.password_hint,
                normalized.created_at,
                normalized.updated_at,
            ),
        )
        await db.commit()
    finally:
        await db.close()
    return normalized


async def delete_remote_session(session_id: str) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM remote_sessions WHERE id = ?", (session_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


@dataclass
class RemoteConnection:
    process: asyncio.subprocess.Process
    reader_task: asyncio.Task | None = None


class RemoteTerminalManager:
    def __init__(self):
        self._connections: dict[str, RemoteConnection] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, session: RemoteSessionRecord, password: str | None, cols: int, rows: int):
        if session.protocol != "ssh":
            await websocket.send_json({"type": "error", "message": f"Embedded terminal only supports SSH right now. {session.protocol.upper()} can be launched natively."})
            return

        if not shutil.which("ssh"):
            await websocket.send_json({"type": "error", "message": "SSH client was not found on this host."})
            return

        process = await self._spawn_ssh_process(session, password=password, cols=cols, rows=rows)
        connection = RemoteConnection(process=process)

        async with self._lock:
            await self._dispose_locked(session.id)
            self._connections[session.id] = connection

        connection.reader_task = asyncio.create_task(self._pump_output(websocket, session.id, process))
        await websocket.send_json({"type": "status", "state": "connected", "sessionId": session.id})

    async def disconnect(self, session_id: str):
        async with self._lock:
            await self._dispose_locked(session_id)

    async def write_input(self, session_id: str, data: str):
        connection = self._connections.get(session_id)
        if not connection or not connection.process.stdin:
            return
        connection.process.stdin.write(data.encode("utf-8", errors="ignore"))
        await connection.process.stdin.drain()

    async def resize(self, session_id: str, cols: int | None, rows: int | None):
        if cols is None or rows is None:
            return
        connection = self._connections.get(session_id)
        if not connection or connection.process.returncode is not None:
            return
        if sys.platform != "win32":
            with contextlib.suppress(Exception):
                connection.process.send_signal(signal.SIGWINCH)

    async def _spawn_ssh_process(self, session: RemoteSessionRecord, password: str | None, cols: int, rows: int):
        destination = f"{session.username}@{session.host}" if session.username else session.host
        command = [
            "ssh",
            "-tt",
            "-p",
            str(session.port or DEFAULT_PORTS["ssh"]),
            destination,
        ]
        if session.remote_path:
            command.append(f"cd {shlex.quote(session.remote_path)} && exec ${'{'}SHELL:-bash{'}'} -l")

        env = os.environ.copy()
        env.setdefault("TERM", "xterm-256color")
        env.setdefault("COLUMNS", str(cols))
        env.setdefault("LINES", str(rows))

        if password:
            # No secure cross-platform PTY automation available in current stack.
            # Password is kept for future native integrations and explicit prompting.
            env["NVIDIA_AI_HUB_REMOTE_PASSWORD"] = password

        return await asyncio.create_subprocess_exec(
            *command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
        )

    async def _pump_output(self, websocket: WebSocket, session_id: str, process: asyncio.subprocess.Process):
        try:
            while True:
                chunk = await process.stdout.read(1024)
                if not chunk:
                    break
                await websocket.send_json({"type": "output", "data": chunk.decode("utf-8", errors="ignore")})
            return_code = await process.wait()
            await websocket.send_json({"type": "status", "state": "closed", "sessionId": session_id, "returnCode": return_code})
        except Exception as exc:
            with contextlib.suppress(Exception):
                await websocket.send_json({"type": "error", "message": str(exc)})
        finally:
            await self.disconnect(session_id)

    async def _dispose_locked(self, session_id: str):
        connection = self._connections.pop(session_id, None)
        if not connection:
            return

        if connection.process.returncode is None:
            connection.process.terminate()
            with contextlib.suppress(ProcessLookupError):
                await asyncio.wait_for(connection.process.wait(), timeout=2)
        if connection.reader_task:
            connection.reader_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await connection.reader_task


terminal_manager = RemoteTerminalManager()


def build_remote_launch_payload(session: RemoteSessionRecord) -> dict:
    port = session.port or DEFAULT_PORTS.get(session.protocol)
    target = f"{session.host}:{port}" if port else session.host
    username_prefix = f"{session.username}@" if session.username else ""

    command = ""
    open_url = None
    native_scheme = None
    rdp_file = None

    if session.protocol == "ssh":
        command = f"ssh -p {port} {username_prefix}{session.host}"
        native_scheme = f"ssh://{username_prefix}{session.host}:{port}"
    elif session.protocol == "sftp":
        command = f"sftp -P {port} {username_prefix}{session.host}"
        native_scheme = f"sftp://{username_prefix}{session.host}:{port}"
    elif session.protocol == "rdp":
        command = f"mstsc /v:{target}"
        native_scheme = f"rdp://full%20address=s:{target}"
        rdp_file = "\n".join(filter(None, [f"full address:s:{target}", f"username:s:{session.username}" if session.username else ""]))
    elif session.protocol == "vnc":
        command = f"vncviewer {target}"
        native_scheme = f"vnc://{target}"
    else:
        scheme = "https" if session.protocol == "https" else "http"
        path_part = session.remote_path if session.remote_path.startswith("/") else f"/{session.remote_path}" if session.remote_path else ""
        open_url = f"{scheme}://{session.host}:{port}{path_part}" if port else f"{scheme}://{session.host}{path_part}"
        command = open_url
        native_scheme = open_url

    return {
        "command": command,
        "openUrl": open_url,
        "nativeScheme": native_scheme,
        "rdpFile": rdp_file,
        "target": target,
    }
