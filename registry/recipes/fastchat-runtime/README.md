# FastChat Runtime

Official FastChat-style runtime baseline for NVIDIA GPUs with one controller, one model worker, and one OpenAI-compatible API server that exposes `/v1` endpoints for local chat, completions, embeddings, and model discovery.

## What it provides

- FastChat controller on port `21001`
- FastChat model worker on port `21002`
- OpenAI-compatible API server on port `8000`
- One practical starter topology aligned with the upstream controller -> worker -> API server architecture
- Persistent Hugging Face cache and local model directory mounts
- Configurable worker flags for device selection, GPU count, 8-bit loading, CPU offloading, and trust-remote-code behavior

## Default access

- OpenAI-compatible models API: `http://localhost:8000/v1/models`
- OpenAI-compatible chat completions: `http://localhost:8000/v1/chat/completions`
- OpenAI-compatible completions: `http://localhost:8000/v1/completions`
- OpenAI-compatible embeddings: `http://localhost:8000/v1/embeddings`
- Controller: `http://localhost:21001`
- Worker: `http://localhost:21002`

## Included services

- `fastchat-controller`: FastChat controller process
- `fastchat-model-worker`: FastChat model worker process for one configured model path
- `fastchat-api-server`: FastChat OpenAI-compatible REST API server

## Scope of this preset

This recipe intentionally provides a conservative FastChat baseline:

- follows the upstream controller, model worker, and `openai_api_server` launch pattern
- exposes the OpenAI-compatible API server as the main integration endpoint
- starts one model worker for one configured model path by default
- persists Hugging Face cache data and a local `/models` mount for repeatable launches
- keeps Gradio web UI, Chatbot Arena, multi-worker fan-out, and third-party ingress layers out of scope

This preset does **not** include:

- the FastChat Gradio web server or Chatbot Arena UI
- automatic benchmarking or sizing validation for every supported model family
- multi-worker orchestration for multiple models on different GPUs
- enterprise authentication, TLS termination, reverse-proxy policy, or tenant isolation

## Required configuration

Before first launch, review `registry/recipes/fastchat-runtime/.env` and change what applies to your environment:

- `FASTCHAT_MODEL_PATH`
- `FASTCHAT_WORKER_MODEL_NAMES`
- `FASTCHAT_NUM_GPUS`
- `FASTCHAT_MAX_GPU_MEMORY` if you need explicit per-GPU caps
- `FASTCHAT_LOAD_8BIT` and `FASTCHAT_CPU_OFFLOADING` when GPU memory is limited
- `FASTCHAT_HF_TOKEN` if the selected model repository is gated
- `FASTCHAT_TRUST_REMOTE_CODE` if the chosen model requires it

Use a Hugging Face repo ID for `FASTCHAT_MODEL_PATH` when you want pull-on-start behavior, or bind local model assets under `./models` and point `FASTCHAT_MODEL_PATH` to that mounted location.

## Runtime notes

- Upstream FastChat documentation launches the stack in this order: controller, model worker, then `openai_api_server`.
- `GET /v1/models` is the lightest practical discovery check for downstream clients.
- FastChat examples commonly use `api_key = "EMPTY"` with the OpenAI client because the local API server is typically unauthenticated unless you place it behind another gateway.
- If the selected model is slow to load, adjust `FASTCHAT_WORKER_API_TIMEOUT` upward.
- Upstream docs also support multiple workers and a `multi_model_worker`, but this recipe keeps the baseline to one worker for one configured model path.

## Persistent data

This recipe stores state under:

- `registry/recipes/fastchat-runtime/cache`
- `registry/recipes/fastchat-runtime/models`
- `registry/recipes/fastchat-runtime/logs`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, Docker build recipe, and operator documentation for the FastChat stack
- aligning the stack shape with upstream FastChat controller, model worker, and `openai_api_server` deployment guidance plus the documented `/v1/models`, `/v1/chat/completions`, `/v1/completions`, and `/v1/embeddings` endpoints
- wiring configurable worker flags for model path, device mode, GPU count, 8-bit loading, CPU offloading, timeout, and optional Hugging Face authentication
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, container build, model download, or GPU-backed inference, because Docker is not available in this Windows workspace
- actual OpenAI SDK compatibility, response quality, or model registration timing against a running worker
- memory fit, startup time, or throughput for any selected model on the target NVIDIA GPUs host
- Gradio, multi-worker, or Chatbot Arena workflows beyond this baseline

## License notes

- Upstream project: `lm-sys/FastChat`
- Upstream project license: Apache-2.0
- Review the selected model license separately because model licensing can differ from the runtime license

## Risk notes

- Large models can exceed available GPU memory unless operators tune `FASTCHAT_NUM_GPUS`, `FASTCHAT_MAX_GPU_MEMORY`, `FASTCHAT_LOAD_8BIT`, or choose a smaller model.
- Some supported models require `--trust-remote-code` or other model-specific adjustments not enabled by default here.
- This baseline leaves the API server unauthenticated unless operators place it behind a gateway or additional network controls.
