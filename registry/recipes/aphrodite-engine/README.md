# Aphrodite Engine

Official Aphrodite OpenAI-compatible serving baseline for NVIDIA GPUs with chat and completions APIs, configurable GPU memory controls, and persistent Hugging Face cache mounts.

## What it provides

- Official `alpindale/aphrodite-openai:latest` container baseline
- OpenAI-compatible `/v1/chat/completions` and `/v1/completions` APIs
- Model-discovery surface via `/v1/models`
- Configurable tensor parallelism, API keys, chat templates, and CORS settings
- GPU memory controls through `--gpu-memory-utilization` and `--single-user-mode`
- Persistent Hugging Face cache, model, and adapter mounts

## Default access

- Models API: `http://localhost:3100/v1/models`
- Chat completions: `http://localhost:3100/v1/chat/completions`
- Completions: `http://localhost:3100/v1/completions`

## Included services

- `aphrodite-engine`: official Aphrodite OpenAI-compatible container

## Scope of this preset

This recipe intentionally provides a conservative single-runtime baseline:

- uses the official Aphrodite Docker image and `aphrodite run` entrypoint
- exposes the documented OpenAI-compatible API surface on the default Aphrodite port
- supports basic runtime hardening through optional API keys and admin key configuration
- exposes common memory and scale controls such as tensor parallelism, GPU memory utilization, and single-user mode
- keeps distributed clusters, speculative-decoding tuning, multimodal specialization, and advanced tool-calling parser workflows out of scope

This preset does **not** include:

- bundled chat UIs or agent frameworks
- production TLS termination, reverse proxies, tenant isolation, or external rate limiting
- validation for every quantization type, hardware backend, or model family supported upstream
- preconfigured tool-calling templates, LoRA catalogs, or multimodal model packs

## Required configuration

Before first launch, review `registry/recipes/aphrodite-engine/.env` and change what applies to your environment:

- `APHRODITE_MODEL`
- `APHRODITE_API_KEY` and `APHRODITE_ADMIN_KEY`
- `APHRODITE_TENSOR_PARALLEL`
- `APHRODITE_GPU_MEMORY_UTILIZATION`
- `APHRODITE_SINGLE_USER_MODE`
- `APHRODITE_MAX_MODEL_LEN`
- `APHRODITE_CHAT_TEMPLATE`
- `APHRODITE_ALLOWED_ORIGINS`, `APHRODITE_ALLOWED_METHODS`, and `APHRODITE_ALLOWED_HEADERS`
- `HF_TOKEN` if the selected model repository is gated or private

If the model lacks a built-in chat template, Aphrodite documentation states that chat completions require `--chat-template`; otherwise the server can fall back to text completions only.

## Runtime notes

- Aphrodite runs an OpenAI-compatible API server on port `2242` by default; this recipe publishes it as `3100` externally.
- Upstream examples recommend `--ipc=host`, which this recipe preserves.
- Aphrodite documentation notes that the engine tends to allocate about 90% of GPU VRAM by default, so this baseline sets `APHRODITE_GPU_MEMORY_UTILIZATION=0.6` and enables `APHRODITE_SINGLE_USER_MODE=true` conservatively.
- The upstream OpenAI server supports optional API and admin keys through CLI flags.
- Tool calling, vision, LoRA, speculative decoding, and advanced parser plugins exist upstream but are intentionally left unconfigured in this baseline.
- No dedicated docs or health endpoint was confirmed during this workspace research, so this recipe anchors the UI on `/v1/models` instead of assuming a separate dashboard.

## Persistent data

This recipe stores state under:

- `registry/recipes/aphrodite-engine/cache`
- `registry/recipes/aphrodite-engine/models`
- `registry/recipes/aphrodite-engine/adapters`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, and documentation for the runtime
- aligning the compose stack with official Aphrodite Docker and `aphrodite run` examples, including OpenAI-compatible endpoints and memory-control flags
- wiring configurable server flags for model selection, API keys, CORS, tensor parallelism, chat templates, and conservative GPU memory usage
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model downloads, or GPU-backed inference, because Docker is not available in this Windows workspace
- endpoint behavior for admin operations, tool calling, or multimodal requests
- model-specific tuning for quantization, LoRA loading, or distributed inference
- the exact availability of a `/health` route, because upstream material reviewed here did not confirm one

## License notes

- Upstream project: `aphrodite-engine/aphrodite-engine`
- Upstream license: AGPL-3.0
- Review the selected model license separately because model licensing can differ from the runtime license

## Risk notes

- Aphrodite is licensed under AGPL-3.0, which may impose stronger redistribution and network-use obligations than Apache-style runtimes in this catalog.
- The `latest` image tag can change behavior over time and may require follow-up compatibility adjustments.
- Large models can still exceed available GPU memory unless tensor parallelism, memory utilization, and model size are tuned carefully.
- Leaving `APHRODITE_API_KEY` empty exposes an unauthenticated inference endpoint on the local network.