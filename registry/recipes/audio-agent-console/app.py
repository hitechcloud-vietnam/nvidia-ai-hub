from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pipecat_ai_small_webrtc_prebuilt.frontend import SmallWebRTCPrebuiltUI

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import IceServer, SmallWebRTCConnection
from pipecat.transports.smallwebrtc.request_handler import (
    IceCandidate,
    SmallWebRTCPatchRequest,
    SmallWebRTCRequest,
    SmallWebRTCRequestHandler,
)
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger("audio-agent-console")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip() or None
OPENAI_LLM_MODEL = os.getenv("OPENAI_LLM_MODEL", "gpt-4.1-mini").strip()
OPENAI_STT_MODEL = os.getenv("OPENAI_STT_MODEL", "gpt-4o-transcribe").strip()
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts").strip()
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "alloy").strip()
OPENAI_TTS_INSTRUCTIONS = os.getenv(
    "OPENAI_TTS_INSTRUCTIONS",
    "Speak clearly, naturally, and keep spoken answers concise.",
).strip()
OPENAI_STT_PROMPT = os.getenv("OPENAI_STT_PROMPT", "").strip() or None
SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a concise and helpful voice AI assistant for NVIDIA GPUs users. Keep answers short, practical, and easy to speak aloud.",
).strip()
GREETING_TEXT = os.getenv(
    "GREETING_TEXT",
    "Greet the user briefly, introduce yourself as a voice assistant, and invite the first question.",
).strip()


def parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


GREETING_ENABLED = parse_bool(os.getenv("GREETING_ENABLED"), True)


@dataclass
class SessionRuntime:
    pc_id: str
    runner_task: asyncio.Task[None]
    pipeline_task: PipelineTask


class SessionRegistry:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionRuntime] = {}
        self._lock = asyncio.Lock()

    async def add(self, runtime: SessionRuntime) -> None:
        async with self._lock:
            self._sessions[runtime.pc_id] = runtime

    async def remove(self, pc_id: str) -> SessionRuntime | None:
        async with self._lock:
            return self._sessions.pop(pc_id, None)

    async def get(self, pc_id: str) -> SessionRuntime | None:
        async with self._lock:
            return self._sessions.get(pc_id)

    async def shutdown(self) -> None:
        async with self._lock:
            sessions = list(self._sessions.values())
            self._sessions.clear()

        for runtime in sessions:
            await cancel_runtime(runtime)


async def cancel_runtime(runtime: SessionRuntime) -> None:
    try:
        await runtime.pipeline_task.cancel()
    except Exception as exc:  # pragma: no cover - defensive cleanup
        logger.debug("Pipeline task cancel raised: %s", exc)

    try:
        await runtime.runner_task
    except Exception as exc:  # pragma: no cover - defensive cleanup
        logger.debug("Runner task completion raised: %s", exc)


session_registry = SessionRegistry()

ice_servers = [IceServer(urls="stun:stun.l.google.com:19302")]
request_handler = SmallWebRTCRequestHandler(ice_servers=ice_servers)


async def run_voice_agent(webrtc_connection: SmallWebRTCConnection) -> None:
    logger.info("Starting voice pipeline for peer %s", webrtc_connection.pc_id)

    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    )

    stt = OpenAISTTService(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
        settings=OpenAISTTService.Settings(
            model=OPENAI_STT_MODEL,
            prompt=OPENAI_STT_PROMPT,
        ),
    )

    tts = OpenAITTSService(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
        settings=OpenAITTSService.Settings(
            model=OPENAI_TTS_MODEL,
            voice=OPENAI_TTS_VOICE,
            instructions=OPENAI_TTS_INSTRUCTIONS,
        ),
    )

    llm = OpenAILLMService(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
        settings=OpenAILLMService.Settings(
            model=OPENAI_LLM_MODEL,
            system_instruction=SYSTEM_PROMPT,
        ),
    )

    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_aggregator,
            llm,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_out_sample_rate=24000,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(_transport: SmallWebRTCTransport, _client: Any) -> None:
        logger.info("Client connected for peer %s", webrtc_connection.pc_id)
        if GREETING_ENABLED:
            context.add_message({"role": "developer", "content": GREETING_TEXT})
            await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(_transport: SmallWebRTCTransport, _client: Any) -> None:
        logger.info("Client disconnected for peer %s", webrtc_connection.pc_id)
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)
    runtime = SessionRuntime(
        pc_id=webrtc_connection.pc_id,
        runner_task=asyncio.current_task(),
        pipeline_task=task,
    )
    await session_registry.add(runtime)

    try:
        await runner.run(task)
    finally:
        await session_registry.remove(webrtc_connection.pc_id)
        logger.info("Voice pipeline finished for peer %s", webrtc_connection.pc_id)


async def start_session(webrtc_connection: SmallWebRTCConnection) -> None:
    existing = await session_registry.get(webrtc_connection.pc_id)
    if existing is not None:
        logger.info("Session already active for peer %s", webrtc_connection.pc_id)
        return

    runner_task = asyncio.create_task(run_voice_agent(webrtc_connection))

    def _log_session_result(task: asyncio.Task[None]) -> None:
        try:
            task.result()
        except asyncio.CancelledError:
            logger.info("Session task cancelled for peer %s", webrtc_connection.pc_id)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Session task failed for peer %s: %s", webrtc_connection.pc_id, exc)

    runner_task.add_done_callback(_log_session_result)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting Audio Agent Console")
    try:
        yield
    finally:
        await session_registry.shutdown()
        await request_handler.close()
        logger.info("Stopped Audio Agent Console")


app = FastAPI(
    title="Audio Agent Console",
    version="1.0.0",
    lifespan=lifespan,
)

app.mount("/client", SmallWebRTCPrebuiltUI)


@app.get("/", include_in_schema=False)
async def root_redirect() -> RedirectResponse:
    return RedirectResponse(url="/client/")


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok" if OPENAI_API_KEY else "degraded",
        "service": "audio-agent-console",
        "openai_configured": bool(OPENAI_API_KEY),
        "client_path": "/client/",
    }


@app.post("/api/offer")
async def offer(request: Request) -> dict[str, str]:
    payload = await request.json()
    try:
        web_request = SmallWebRTCRequest(
            sdp=payload["sdp"],
            type=payload["type"],
            pc_id=payload.get("pc_id"),
            restart_pc=payload.get("restart_pc", False),
        )
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=f"Missing field: {exc.args[0]}") from exc

    answer = await request_handler.handle_web_request(web_request, start_session)
    if answer is None:
        raise HTTPException(status_code=500, detail="WebRTC answer was not produced")
    return answer


@app.patch("/api/offer")
async def patch_offer(request: Request) -> dict[str, str]:
    payload = await request.json()
    try:
        patch_request = SmallWebRTCPatchRequest(
            pc_id=payload["pc_id"],
            candidates=[
                IceCandidate(
                    candidate=item["candidate"],
                    sdp_mid=item["sdp_mid"],
                    sdp_mline_index=item["sdp_mline_index"],
                )
                for item in payload.get("candidates", [])
            ],
        )
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=f"Missing field: {exc.args[0]}") from exc

    await request_handler.handle_patch_request(patch_request)
    return {"status": "ok"}
