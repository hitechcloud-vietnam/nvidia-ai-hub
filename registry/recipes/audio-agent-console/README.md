# Audio Agent Console

Run a browser-based voice agent console on DGX Spark with Pipecat SmallWebRTC transport, OpenAI speech services, and a prebuilt web client.

## What it provides

- Browser voice console on port `7890`
- Prebuilt Pipecat SmallWebRTC client at `/client/`
- `GET /health` readiness endpoint
- `POST /api/offer` and `PATCH /api/offer` signaling endpoints for WebRTC negotiation
- OpenAI-backed speech-to-text, LLM response generation, and text-to-speech in one local service
- Configurable system prompt, greeting, model IDs, voice, and optional custom OpenAI-compatible base URL

## Default access

- Web client: `http://localhost:7890/client/`
- Root redirect: `http://localhost:7890/`
- Health: `http://localhost:7890/health`

## Configuration notes

Set `OPENAI_API_KEY` in `.env` before launch.

Optional overrides:

- `OPENAI_BASE_URL` for OpenAI-compatible gateways
- `OPENAI_LLM_MODEL` for the chat model
- `OPENAI_STT_MODEL` for transcription
- `OPENAI_TTS_MODEL` and `OPENAI_TTS_VOICE` for speech synthesis
- `SYSTEM_PROMPT` to change assistant behavior
- `GREETING_ENABLED` and `GREETING_TEXT` to control the initial spoken greeting

This starter uses a concise voice-agent prompt and a prebuilt browser client so reviewers can focus on registry integration and basic speech flow first.

## Notes

The service depends on remote speech and language APIs unless `OPENAI_BASE_URL` points to a compatible local or self-hosted endpoint.

WebRTC requires microphone permission in the browser.

If the browser connects but audio does not start, confirm the API key, model availability, and outbound network access from Docker.

## Validation scope

This recipe was added as a registry scaffold for DGX Spark. Validation should focus on recipe loading, YAML shape, Docker asset presence, and smoke-testing the browser session plus signaling endpoints in a Linux Docker environment.

## License notes

- Upstream Pipecat project is released under the `BSD-2-Clause` license
- The bundled web client package `pipecat-ai-small-webrtc-prebuilt` should be reviewed alongside deployed service terms before production rollout
- OpenAI or OpenAI-compatible backend terms still apply to configured models and endpoints

## Risk notes

This recipe captures live microphone audio and may send transcripts or prompts to external model endpoints. Review consent, retention, disclosure, and network routing requirements before production use.
