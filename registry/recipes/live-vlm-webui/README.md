# Live VLM WebUI on DGX Spark

Live VLM WebUI provides a real-time webcam and WebRTC interface for vision-language models on DGX Spark. This Spark AI Hub recipe runs the official NVIDIA container, exposes the HTTPS UI on port `8090`, and defaults to a local Ollama-compatible backend.

## Access

After launch, open:

- `https://<SPARK_IP>:8090`

Your browser will warn about the self-signed certificate on first access. Accept the certificate to enable webcam permissions.

## Default backend

The recipe starts with these defaults:

- `LIVE_VLM_API_BASE=http://localhost:11434/v1`
- `LIVE_VLM_DEFAULT_MODEL=llama3.2-vision:11b`
- `LIVE_VLM_PROCESS_EVERY=30`

Because the container uses host networking, `localhost` resolves to DGX Spark services such as Ollama.

## Configuration

Edit `registry/recipes/live-vlm-webui/.env` from the recipe configuration view if you need to:

- point to vLLM, SGLang, NIM, or a cloud endpoint
- change the default model
- lower the frame processing rate for reduced GPU/API usage
- move the UI to another port

## Notes

- HTTPS is required for webcam access.
- WebRTC works best when users connect directly to the DGX Spark IP instead of SSH port forwarding.
- If no local backend is reachable, the upstream app can still be configured in-browser for remote APIs.
