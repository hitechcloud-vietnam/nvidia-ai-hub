from __future__ import annotations

import json
import logging
import os
import tempfile
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("live-transcription-hub")


PORT = int(os.environ.get("PORT", "8000"))
MODEL_SIZE = os.environ.get("MODEL_SIZE", "small")
DEVICE = os.environ.get("DEVICE", "cuda")
COMPUTE_TYPE = os.environ.get("COMPUTE_TYPE", "float16")
MAX_CLIENTS = int(os.environ.get("MAX_CLIENTS", "4"))
MAX_CONNECTION_TIME = int(os.environ.get("MAX_CONNECTION_TIME", "600"))
SEND_LAST_N_SEGMENTS = int(os.environ.get("SEND_LAST_N_SEGMENTS", "10"))
DEFAULT_USE_VAD = os.environ.get("DEFAULT_USE_VAD", "true").lower() == "true"
DEFAULT_TASK = os.environ.get("DEFAULT_TASK", "transcribe")
HF_HOME = os.environ.get("HF_HOME", "/data/hf-cache")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/data/output")
TEMP_DIR = os.environ.get("TEMP_DIR", "/data/tmp")

os.environ.setdefault("HF_HOME", HF_HOME)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

app = FastAPI(title="Live Transcription Hub", version="1.0.0")


@dataclass
class ClientSession:
    uid: str
    model: str = MODEL_SIZE
    language: str | None = None
    task: str = DEFAULT_TASK
    use_vad: bool = DEFAULT_USE_VAD
    send_last_n_segments: int = SEND_LAST_N_SEGMENTS
    transcript: list[dict[str, Any]] = field(default_factory=list)
    started_at: float = field(default_factory=lambda: __import__("time").time())


class SessionManager:
    def __init__(self, max_clients: int, max_connection_time: int) -> None:
        self.max_clients = max_clients
        self.max_connection_time = max_connection_time
        self._sessions: dict[str, ClientSession] = {}
        self._lock = Lock()

    def add(self, session: ClientSession) -> tuple[bool, float | None]:
        with self._lock:
            if len(self._sessions) >= self.max_clients:
                oldest_remaining = min(
                    max(self.max_connection_time - (__import__("time").time() - existing.started_at), 0)
                    for existing in self._sessions.values()
                )
                return False, oldest_remaining / 60
            self._sessions[session.uid] = session
            return True, None

    def get(self, uid: str) -> ClientSession | None:
        return self._sessions.get(uid)

    def remove(self, uid: str) -> None:
        with self._lock:
            self._sessions.pop(uid, None)


sessions = SessionManager(MAX_CLIENTS, MAX_CONNECTION_TIME)
_model_lock = Lock()
_model: WhisperModel | None = None


def get_model(model_name: str) -> WhisperModel:
    global _model
    with _model_lock:
        if _model is None:
            logger.info("Loading Faster-Whisper model '%s' on %s (%s)", model_name, DEVICE, COMPUTE_TYPE)
            _model = WhisperModel(model_name, device=DEVICE, compute_type=COMPUTE_TYPE)
        return _model


def format_segments(raw_segments: list[Any]) -> list[dict[str, Any]]:
    formatted: list[dict[str, Any]] = []
    for segment in raw_segments:
        formatted.append(
            {
                "start": f"{segment.start:.3f}",
                "end": f"{segment.end:.3f}",
                "text": segment.text.strip(),
                "completed": True,
            }
        )
    return formatted


def transcribe_file(file_path: str, *, model_name: str, language: str | None, task: str, use_vad: bool) -> tuple[list[dict[str, Any]], Any]:
    model = get_model(model_name)
    segments, info = model.transcribe(
        file_path,
        language=language,
        task=task,
        vad_filter=use_vad,
        word_timestamps=False,
    )
    materialized = list(segments)
    return format_segments(materialized), info


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "live-transcription-hub",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "max_clients": MAX_CLIENTS,
        "max_connection_time": MAX_CONNECTION_TIME,
    }


@app.post("/v1/audio/transcriptions")
async def openai_transcriptions(
    file: UploadFile = File(...),
    model: str = Form(default="whisper-1"),
    language: str | None = Form(default=None),
    prompt: str | None = Form(default=None),
    response_format: str = Form(default="json"),
    temperature: float = Form(default=0.0),
    timestamp_granularities: list[str] | None = Form(default=None),
) -> Any:
    del prompt, temperature, timestamp_granularities
    if response_format not in {"json", "text", "verbose_json"}:
        return JSONResponse({"error": "Unsupported response_format"}, status_code=400)

    suffix = os.path.splitext(file.filename or "upload.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TEMP_DIR) as temp_file:
        temp_file.write(await file.read())
        temp_path = temp_file.name

    try:
        resolved_model = MODEL_SIZE if model == "whisper-1" else model
        segments, info = transcribe_file(
            temp_path,
            model_name=resolved_model,
            language=language,
            task=DEFAULT_TASK,
            use_vad=DEFAULT_USE_VAD,
        )
        text = " ".join(segment["text"] for segment in segments).strip()
        if response_format == "text":
            return text
        if response_format == "verbose_json":
            return {
                "task": DEFAULT_TASK,
                "language": getattr(info, "language", language),
                "duration": getattr(info, "duration", None),
                "text": text,
                "segments": segments,
            }
        return {"text": text}
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            logger.warning("Failed to remove temporary file %s", temp_path)


@app.post("/transcribe")
async def transcribe_upload(
    audio: UploadFile = File(...),
    task: str = Form(default=DEFAULT_TASK),
    language: str | None = Form(default=None),
    model: str = Form(default=MODEL_SIZE),
    vad_filter: bool = Form(default=DEFAULT_USE_VAD),
) -> dict[str, Any]:
    suffix = os.path.splitext(audio.filename or "upload.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TEMP_DIR) as temp_file:
        temp_file.write(await audio.read())
        temp_path = temp_file.name

    try:
        segments, info = transcribe_file(
            temp_path,
            model_name=model,
            language=language,
            task=task,
            use_vad=vad_filter,
        )
        text = " ".join(segment["text"] for segment in segments).strip()
        return {
            "language": getattr(info, "language", language),
            "duration": getattr(info, "duration", None),
            "text": text,
            "segments": segments,
        }
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            logger.warning("Failed to remove temporary file %s", temp_path)


@app.websocket("/")
async def websocket_transcribe(websocket: WebSocket) -> None:
    await websocket.accept()
    session: ClientSession | None = None
    temp_path: str | None = None
    file_handle = None

    try:
        options = await websocket.receive_json()
        uid = options.get("uid")
        if not uid:
            await websocket.send_json({"status": "ERROR", "message": "Missing uid"})
            await websocket.close()
            return

        session = ClientSession(
            uid=uid,
            model=options.get("model", MODEL_SIZE),
            language=options.get("language"),
            task=options.get("task", DEFAULT_TASK),
            use_vad=bool(options.get("use_vad", DEFAULT_USE_VAD)),
            send_last_n_segments=int(options.get("send_last_n_segments", SEND_LAST_N_SEGMENTS)),
        )
        added, wait_minutes = sessions.add(session)
        if not added:
            await websocket.send_json({"uid": uid, "status": "WAIT", "message": wait_minutes})
            await websocket.close()
            return

        temp_fd, temp_path = tempfile.mkstemp(suffix=".wav", dir=TEMP_DIR)
        os.close(temp_fd)
        file_handle = open(temp_path, "wb")

        await websocket.send_json({"uid": uid, "message": "SERVER_READY", "backend": "faster_whisper"})

        while True:
            elapsed = __import__("time").time() - session.started_at
            if elapsed >= MAX_CONNECTION_TIME:
                await websocket.send_json({"uid": uid, "message": "DISCONNECT"})
                break

            message = await websocket.receive()
            if "bytes" in message and message["bytes"] is not None:
                file_handle.write(message["bytes"])
                file_handle.flush()
                continue

            text_payload = message.get("text")
            if text_payload is None:
                continue

            if text_payload == "END_OF_AUDIO":
                break

            try:
                control = json.loads(text_payload)
            except json.JSONDecodeError:
                continue

            if control.get("event") == "END_OF_AUDIO":
                break

        file_handle.close()
        file_handle = None

        if temp_path and os.path.getsize(temp_path) > 0:
            segments, info = transcribe_file(
                temp_path,
                model_name=session.model,
                language=session.language,
                task=session.task,
                use_vad=session.use_vad,
            )
            session.transcript = segments
            if getattr(info, "language", None):
                await websocket.send_json(
                    {
                        "uid": session.uid,
                        "language": info.language,
                        "language_prob": getattr(info, "language_probability", 1.0),
                    }
                )
            await websocket.send_json(
                {
                    "uid": session.uid,
                    "segments": session.transcript[-session.send_last_n_segments :],
                }
            )
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    finally:
        if file_handle is not None and not file_handle.closed:
            file_handle.close()
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                logger.warning("Failed to remove temporary websocket file %s", temp_path)
        if session is not None:
            sessions.remove(session.uid)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
