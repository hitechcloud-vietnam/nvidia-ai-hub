# LlamaIndex Starter

Practical self-hosted LlamaIndex starter for NVIDIA GPUs using a local FastAPI app, Qdrant vector storage, and the shared `ollama-runtime` recipe for chat and embedding models.

## What it provides

- LlamaIndex starter web UI on port `3084`
- FastAPI health endpoint at `/health`
- Query API at `/api/query`
- Reindex API at `/api/reindex`
- Local Qdrant service on ports `6337` and `6338`
- Persistent document, storage, and Qdrant data under `./data/*`

## Default access

- Web UI: `http://localhost:3084`
- Health: `http://localhost:3084/health`
- Query API: `http://localhost:3084/api/query`
- Reindex API: `http://localhost:3084/api/reindex`
- Qdrant HTTP: `http://localhost:6337`

## Included services

- local LlamaIndex FastAPI starter app built in this repository
- official `qdrant/qdrant` vector database container
- external dependency on `ollama-runtime` through `http://host.docker.internal:11435`

## Required configuration

Before first launch:

1. Start `ollama-runtime`.
2. Ensure the shared Ollama runtime has both models pulled:
   - chat model: `qwen3.5:4b`
   - embedding model: `nomic-embed-text`
3. Review `registry/recipes/llamaindex-starter/.env` if you want different ports, models, or chunking settings.
4. Place your source files under `registry/recipes/llamaindex-starter/data/documents`.

## Scope of this starter

This recipe intentionally packages a narrow, practical starter aligned with official LlamaIndex usage patterns:

- local document ingestion from a mounted data folder
- LlamaIndex vector index creation with Ollama-backed LLM and embeddings
- Qdrant-backed retrieval for repeatable local RAG experiments
- simple local web UI and HTTP APIs for smoke testing

This recipe does **not** include:

- LlamaCloud or LlamaParse
- a large upstream full-stack UI product
- enterprise auth, user management, or multi-tenant controls
- PostgreSQL, Redis, MinIO, or other heavy supporting services

## Persistent data

This recipe stores state under:

- `registry/recipes/llamaindex-starter/data/documents`
- `registry/recipes/llamaindex-starter/data/storage`
- `registry/recipes/llamaindex-starter/data/qdrant`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, Docker build assets, compose definition, and recipe documentation
- wiring the starter app to the shared `ollama-runtime` endpoint and local Qdrant service
- exposing the expected local ports `3084`, `6337`, and `6338`
- verifying `docker compose config` resolves the environment, mounts, and service definitions for this recipe
- checking editor diagnostics for the newly created recipe files

Not validated here:

- full Docker image build completion for the LlamaIndex app on this Windows workspace
- live querying against a running Ollama server with pulled `qwen3.5:4b` and `nomic-embed-text` models
- accuracy or quality of retrieval on user-provided documents

## License notes

- Upstream project: `run-llama/llama_index`
- Upstream starter basis and framework licensing: MIT
- Review Qdrant image licensing separately before production redistribution

## Risk notes

- First boot and first query depend on a reachable shared Ollama server and the required models already being present.
- LlamaIndex package APIs evolve quickly, so future upstream changes may require dependency pin updates.
- Retrieval quality depends on the selected embedding model, document quality, and chunking settings.
- This is a starter workflow for local experimentation, not a hardened enterprise deployment.
