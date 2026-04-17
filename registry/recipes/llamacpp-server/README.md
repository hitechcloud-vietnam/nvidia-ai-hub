# llama.cpp Server

Official `llama.cpp` HTTP server baseline for NVIDIA GPUs with OpenAI-compatible APIs, built-in Web UI, GGUF model serving, optional Hugging Face pull-on-start, and persistent local cache directories.

## What it provides

- Official CUDA-enabled `ghcr.io/ggml-org/llama.cpp:server-cuda` image
- Web UI and API surface on port `3096`
- OpenAI-compatible endpoints under `/v1`
- Native `llama.cpp` endpoints such as `/health`, `/metrics`, `/slots`, and `/props`
- Optional pull-on-start from Hugging Face through `LLAMA_ARG_HF_REPO`
- Persistent local directories for `/models`, Hugging Face cache data, and slot-save files

## Default access

- Web UI: `http://localhost:3096`
- Health check: `http://localhost:3096/health`
- OpenAI-compatible models API: `http://localhost:3096/v1/models`
- Metrics endpoint: `http://localhost:3096/metrics`

## Included services

- `llamacpp-server`: official `llama.cpp` server container

## Scope of this preset

This recipe intentionally provides a conservative single-server baseline:

- uses the official CUDA-enabled `llama.cpp` container image
- serves one configured GGUF model at a time through the standard `llama-server` process
- supports either a local GGUF path via `LLAMA_ARG_MODEL` or a Hugging Face source via `LLAMA_ARG_HF_REPO`
- persists model artifacts and cache data locally so repeated launches do not need to re-download everything
- keeps router mode, multi-model orchestration, speculative draft-model tuning, TLS termination, and reverse-proxy hardening out of scope

This preset does **not** include:

- automatic benchmarking of the selected model against NVIDIA GPUs memory limits
- a bundled chat product such as Open WebUI, Flowise, or AnythingLLM
- guaranteed compatibility for every GGUF model family without prompt-template or runtime tuning
- enterprise authentication, TLS certificates, or network policy enforcement

## Required configuration

Before first launch, review `registry/recipes/llamacpp-server/.env` and change at least what applies to your environment:

- `LLAMA_ARG_HF_REPO` or `LLAMA_ARG_MODEL`
- `LLAMA_MODEL_ALIAS`
- `LLAMA_ARG_CTX_SIZE`
- `LLAMA_ARG_N_PARALLEL`
- `LLAMA_ARG_N_GPU_LAYERS`
- `LLAMA_API_KEY` if you do not want an unauthenticated local endpoint
- `HF_TOKEN` if your chosen model repository is gated

Use **one** model source pattern at a time:

1. Set `LLAMA_ARG_HF_REPO` for a direct Hugging Face-backed startup path.
2. Or clear `LLAMA_ARG_HF_REPO` and set `LLAMA_ARG_MODEL` to a local GGUF file under `/models`.

## Runtime notes

- The official server exposes both a built-in Web UI and multiple API families from the same port.
- `GET /health` returns `503` while the model is still loading and `200` only after the selected model is ready.
- `--metrics`, `--slots`, `--cache-prompt`, and `--cont-batching` are enabled by default in this preset.
- If `LLAMA_API_KEY` is left empty, the endpoint remains unauthenticated and should stay on trusted local networks only.
- Some GGUF models may require additional template, multimodal projector, or pooling flags beyond this baseline.

## Persistent data

This recipe stores state under:

- `registry/recipes/llamacpp-server/models`
- `registry/recipes/llamacpp-server/cache`
- `registry/recipes/llamacpp-server/slots`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, and documentation for the runtime
- aligning the compose stack with the official `llama.cpp` server Docker usage and documented `/health` plus `/v1/*` API surfaces
- wiring persistent mounts for local models, Hugging Face cache reuse, and slot-save files
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model download, or GPU-backed inference, because Docker is not available in this Windows workspace
- actual Hugging Face download behavior for gated or rate-limited repositories
- throughput, latency, or memory fit for any specific GGUF model on the target host
- optional multimodal, reranking, or router-mode workflows

## License notes

- Upstream project: `ggml-org/llama.cpp`
- Upstream license: MIT
- Review the selected GGUF model license separately because model licensing can differ from the server runtime license

## Risk notes

- The selected model source can dominate startup time and disk usage, especially when `LLAMA_ARG_HF_REPO` pulls multi-gigabyte artifacts on first boot.
- Leaving `LLAMA_API_KEY` empty exposes an unauthenticated inference endpoint.
- Some model families may need prompt-template overrides, multimodal projector files, or additional flags before they behave correctly in OpenAI-compatible chat flows.
