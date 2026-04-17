# SGLang Runtime

Official SGLang runtime baseline for NVIDIA GPUs with OpenAI-compatible APIs, native generation endpoints, Swagger API docs, configurable launch arguments, and persistent Hugging Face cache mounts.

## What it provides

- Official `lmsysorg/sglang:latest-runtime` container baseline
- OpenAI-compatible endpoints under `/v1`
- Native SGLang endpoints such as `/generate`, `/health`, `/health_generate`, `/model_info`, and `/server_info`
- Interactive API docs under `/docs` and OpenAPI schema under `/openapi.json`
- Persistent Hugging Face cache and optional local model directory mounts
- Shared-memory sizing control for stable multi-process runtime startup

## Default access

- API docs: `http://localhost:3097/docs`
- Health check: `http://localhost:3097/health`
- Health with generation probe: `http://localhost:3097/health_generate`
- OpenAI-compatible models API: `http://localhost:3097/v1/models`
- Native generation API: `http://localhost:3097/generate`

## Included services

- `sglang-runtime`: official SGLang runtime container

## Scope of this preset

This recipe intentionally provides a conservative single-runtime baseline:

- uses the official SGLang runtime image recommended for production-style container deployments
- starts a single HTTP inference server with one configured model path or Hugging Face repo ID
- exposes OpenAI-compatible chat, completions, embeddings, and model-discovery endpoints from one port
- persists Hugging Face cache data locally so subsequent launches can reuse downloaded artifacts
- keeps distributed multi-node orchestration, router topologies, Kubernetes operators, and custom gateway layers out of scope

This preset does **not** include:

- automatic benchmarking or sizing validation for every supported SGLang model family
- bundled chat products such as Open WebUI, Flowise, or AnythingLLM
- enterprise authentication, TLS termination, reverse-proxy policy, or tenant isolation
- multi-node tensor-parallel bootstrap, SGLang Model Gateway, or PD-disaggregation wiring

## Required configuration

Before first launch, review `registry/recipes/sglang-runtime/.env` and change what applies to your environment:

- `SGLANG_MODEL_PATH`
- `SGLANG_SERVED_MODEL_NAME`
- `SGLANG_API_KEY` and `SGLANG_ADMIN_API_KEY` if you do not want an unauthenticated local endpoint
- `SGLANG_TENSOR_PARALLEL` and `SGLANG_DATA_PARALLEL`
- `SGLANG_CONTEXT_LENGTH`
- `SGLANG_MEM_FRACTION_STATIC`
- `SGLANG_CHUNKED_PREFILL_SIZE`
- `SGLANG_SHM_SIZE`
- `SGLANG_HF_TOKEN` if the selected model repository is gated or private

Use a Hugging Face repo ID for `SGLANG_MODEL_PATH` when you want pull-on-start behavior, or bind local model assets under `./models` and point `SGLANG_MODEL_PATH` to that mounted path.

## Runtime notes

- The recommended server entrypoint is `sglang serve`, which this preset uses directly.
- The default HTTP listen port inside the container is `30000`, published externally as `3097` in this recipe.
- `GET /health` returns `200` once the HTTP server is reachable; `GET /health_generate` performs a stronger health probe and can return `503` during startup or shutdown.
- `GET /server_info`, `GET /model_info`, and `GET /v1/models` are useful for runtime discovery and downstream integration checks.
- SGLang documentation recommends sufficient shared memory for Docker workloads; this preset exposes `SGLANG_SHM_SIZE` for that reason.
- If FlashInfer-specific issues appear on supported GPUs, upstream documentation suggests trying `--attention-backend triton --sampling-backend pytorch`.

## Persistent data

This recipe stores state under:

- `registry/recipes/sglang-runtime/cache`
- `registry/recipes/sglang-runtime/models`
- `registry/recipes/sglang-runtime/logs`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, and documentation for the runtime
- aligning the compose stack with official SGLang Docker guidance, shared-memory requirements, and documented `/health`, `/health_generate`, `/server_info`, `/model_info`, `/generate`, and `/v1/*` API surfaces
- wiring configurable launch arguments for model path, API keys, parallelism, memory fraction, scheduling, and optional backend overrides
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model download, or GPU-backed inference, because Docker is not available in this Windows workspace
- startup behavior for gated Hugging Face models that require authentication
- throughput, latency, memory fit, or kernel-backend stability for any specific model on the target host
- distributed serving, router, LoRA, reasoning-parser, or multimodal workflows beyond this baseline

## License notes

- Upstream project: `sgl-project/sglang`
- Upstream license: Apache-2.0
- Review the selected model license separately because model licensing can differ from the runtime license

## Risk notes

- The `latest-runtime` image tag can change behavior over time and may require follow-up compatibility adjustments.
- Large models may need more shared memory, GPU memory, or disk than this baseline recipe assumes.
- Leaving `SGLANG_API_KEY` empty exposes an unauthenticated inference endpoint on the local network.
- Some model families require additional flags such as `--trust-remote-code`, quantization settings, reasoning parsers, or backend overrides before they behave correctly.