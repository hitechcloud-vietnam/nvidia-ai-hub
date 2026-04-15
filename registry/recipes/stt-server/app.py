import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel
import uvicorn

PORT = int(os.getenv("PORT", "8000"))
MODEL_SIZE = os.getenv("MODEL_SIZE", "large-v3")
DEVICE = os.getenv("DEVICE", "cuda")
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE", "float16")
DEFAULT_BEAM_SIZE = int(os.getenv("DEFAULT_BEAM_SIZE", "5"))
DEFAULT_VAD_FILTER = os.getenv("DEFAULT_VAD_FILTER", "true").lower() in {"1", "true", "yes", "on"}
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
UPLOAD_DIR = OUTPUT_DIR / "uploads"

if DEVICE == "cpu" and COMPUTE_TYPE == "float16":
    COMPUTE_TYPE = "int8"

MODEL = None
MODEL_LOCK = Lock()

app = FastAPI(title="STT Server", version="1.0.0")


def get_model() -> WhisperModel:
    global MODEL
    with MODEL_LOCK:
        if MODEL is None:
            MODEL = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    return MODEL


def save_result(payload: dict) -> str:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = OUTPUT_DIR / f"stt-server-{stamp}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(path)


@app.get("/")
def root() -> dict:
    return {
        "name": "STT Server",
        "model": MODEL_SIZE,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
    }


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    task: str = Form("transcribe"),
    language: str | None = Form(None),
    beam_size: int = Form(DEFAULT_BEAM_SIZE),
    word_timestamps: bool = Form(True),
    vad_filter: bool = Form(DEFAULT_VAD_FILTER),
    initial_prompt: str | None = Form(None),
):
    if task not in {"transcribe", "translate"}:
        raise HTTPException(status_code=400, detail="task must be 'transcribe' or 'translate'")

    suffix = Path(audio.filename or "audio.bin").suffix or ".bin"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    upload_path = UPLOAD_DIR / f"upload-{stamp}{suffix}"

    try:
        with upload_path.open("wb") as handle:
            while True:
                chunk = await audio.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)

        model = get_model()
        segments, info = model.transcribe(
            str(upload_path),
            task=task,
            language=language or None,
            beam_size=int(beam_size),
            word_timestamps=word_timestamps,
            vad_filter=vad_filter,
            initial_prompt=initial_prompt or None,
        )

        serialized_segments = []
        for segment in segments:
            item = {
                "id": segment.id,
                "start": segment.start,
                "end": segment.end,
                "text": segment.text,
                "avg_logprob": segment.avg_logprob,
                "compression_ratio": segment.compression_ratio,
                "no_speech_prob": segment.no_speech_prob,
                "temperature": segment.temperature,
            }
            if getattr(segment, "words", None):
                item["words"] = [
                    {
                        "start": word.start,
                        "end": word.end,
                        "word": word.word,
                        "probability": word.probability,
                    }
                    for word in segment.words
                ]
            serialized_segments.append(item)

        payload = {
            "model": MODEL_SIZE,
            "task": task,
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration,
            "duration_after_vad": getattr(info, "duration_after_vad", None),
            "segments": serialized_segments,
            "text": "".join(segment["text"] for segment in serialized_segments).strip(),
        }
        payload["saved_path"] = save_result(payload)
        return JSONResponse(payload)
    finally:
        upload_path.unlink(missing_ok=True)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
