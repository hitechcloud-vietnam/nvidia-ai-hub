# Ollama Runtime

Official Ollama runtime baseline for NVIDIA GPUs with a lightweight management UI, persistent local model storage, configurable starter-model bootstrap, and a shared local API endpoint for downstream recipes.

## What it provides

- Official `ollama/ollama` runtime with GPU reservation support
- Shared host API endpoint on port `11435`
- Lightweight management UI on port `3014`
- Persistent model cache under `./data`
- Optional starter-model bootstrap on first successful runtime reachability
- Catalog of recommended chat, reasoning, code, vision, and embedding models exposed in the local UI

## Default access

- Shared Ollama API: `http://localhost:11435`
- Management UI: `http://localhost:3014`
- Health endpoint: `http://localhost:3014/api/health`
- Runtime metadata: `http://localhost:3014/api/runtime`

## Included services

- `ollama`: official Ollama runtime container
- `ollama-runtime-ui`: local FastAPI management surface for health, model catalog, downloads, and delete actions

## Scope of this preset

This recipe intentionally provides a conservative local runtime baseline:

- uses the official Ollama container for model serving
- builds a small local management UI already included in this repository
- persists downloaded models in a bind-mounted local directory for predictable backup and cleanup behavior
- defaults to a single starter model for first-run convenience, but allows replacement through `.env`
- keeps authentication proxies, TLS termination, multi-node routing, model mirroring, and enterprise governance features out of scope

This preset does **not** include:

- automatic validation that your GPU, driver, or Docker runtime are correctly configured
- bundled chat UI products such as Open WebUI, Flowise, or AnythingLLM
- guaranteed pre-download of every recommended model shown in the UI catalog
- hardened network isolation, SSO, API gateway policies, or tenant separation

## Required configuration

Before first launch, review `registry/recipes/ollama-runtime/.env` and adjust as needed:

- `OLLAMA_HOST_PORT`
- `OLLAMA_UI_PORT`
- `STARTER_MODEL`
- `STARTER_DISPLAY_NAME`
- `SHARED_ENDPOINT`
- `OLLAMA_KEEP_ALIVE`

If `host.docker.internal` does not resolve correctly in your Docker environment, set `SHARED_ENDPOINT` to a reachable address that other containers and clients can use.

## Runtime notes

- The management UI polls the local Ollama API and reports healthy status only when the runtime is reachable and the configured starter model is present.
- On startup, the management UI attempts to pull `STARTER_MODEL` after the runtime becomes reachable.
- The recommended model catalog shown in the UI is informational; it is not a guarantee that every listed model fits your available memory budget.
- Model pull duration depends on network throughput, disk speed, and the selected model size.

## Persistent data

This recipe stores downloaded models under:

- `registry/recipes/ollama-runtime/data`

The management UI code remains part of the recipe source tree and does not store runtime state outside the mounted Ollama model directory.

## Validation scope

Validated in this repository by:

- updating recipe metadata to match the current registry schema
- adding `.env` and `.env.example` templates for the runtime recipe
- aligning the compose stack with the official Ollama image plus the existing local management UI image build
- checking that persistent bind mounts, published ports, and environment-variable wiring are internally consistent

Not validated here:

- live `docker compose up`, GPU inference, or starter-model download, because Docker is not available in this Windows workspace
- end-to-end requests from dependent recipes to the running Ollama endpoint
- GPU memory fit for any specific model listed in the UI catalog
- production hardening, authentication, or reverse-proxy behavior

## License notes

- Upstream runtime: `ollama/ollama`
- Review the upstream Ollama license and container terms before redistribution or commercial packaging
- The lightweight management UI in this recipe is repository-local glue code and does not replace upstream support boundaries

## Risk notes

- The `latest` Ollama image tag can change behavior over time and may require follow-up environment or compatibility updates.
- Large models can consume substantial disk and GPU memory; reviewers should verify that chosen starter and downloaded models match the target hardware envelope.
- The shared API endpoint is intentionally unauthenticated in this baseline preset, so it should remain on trusted local networks unless you add a gateway or proxy layer.
