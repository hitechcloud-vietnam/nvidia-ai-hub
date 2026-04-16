# Live Transcription Hub

Run a local real-time transcription service on DGX Spark with a Whisper-style WebSocket interface and an OpenAI-compatible audio upload endpoint.

## What it provides

- OpenAPI docs on port `7888`
- `GET /health` readiness endpoint
- `POST /transcribe` for simple multipart uploads
- `POST /v1/audio/transcriptions` for OpenAI-compatible upload requests
- WebSocket endpoint at `ws://localhost:7888/` for live audio sessions with `SERVER_READY`, `WAIT`, `DISCONNECT`, `language`, and `segments` messages
- Persistent Faster-Whisper model cache and temporary processing storage across restarts

## Default access

- API docs: `http://localhost:7888/docs`
- Health: `http://localhost:7888/health`
- OpenAI-compatible transcription: `http://localhost:7888/v1/audio/transcriptions`
- WebSocket: `ws://localhost:7888/`

## WebSocket protocol notes

The WebSocket flow is intentionally shaped to resemble WhisperLive clients:

1. Connect to `ws://localhost:7888/`
2. Send a JSON config object with fields such as `uid`, `language`, `task`, `model`, `use_vad`, and `send_last_n_segments`
3. Wait for a `SERVER_READY` message
4. Stream binary audio data and then send `END_OF_AUDIO`
5. Receive detected language metadata and the last completed transcript segments

This recipe currently processes each live session after the captured stream ends. It preserves the WhisperLive-style message contract for local integration and testing, but it does not yet provide token-by-token incremental partial updates.

## Notes

The first transcription request downloads the selected Faster-Whisper model into `./data/hf-cache`.

Default settings favor a lightweight `small` model for faster startup. Increase `MODEL_SIZE` in `.env` if higher accuracy is needed and GPU memory allows it.

Uploaded audio and generated transcripts may contain sensitive data. Review mounted storage paths before sharing or archiving them.

## Validation scope

This recipe was added as a registry scaffold for DGX Spark. Validation should focus on recipe loading, YAML shape, Docker asset presence, and smoke-testing the HTTP/WebSocket endpoints in a Linux Docker environment.

## License notes

- Upstream WhisperLive project is released under the `MIT` license
- This local scaffold uses `faster-whisper`, which should be reviewed alongside deployed model terms before production use

## Risk notes

This recipe enables live speech capture and transcription. Review consent, retention, and disclosure requirements before using it with user or customer audio.

The current WebSocket implementation buffers one session before transcription, so reviewers should treat it as a compatibility-focused starter recipe rather than a fully optimized low-latency streaming server.