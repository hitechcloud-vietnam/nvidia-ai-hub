# Haystack Studio

Official-style Haystack starter for DGX Spark using `Hayhooks` as the serving layer, `Open WebUI` as the chat frontend, local `Qdrant` storage, and the shared `ollama-runtime` recipe for both chat and embedding models.

## What it provides

- Open WebUI chat workspace on port `3085`
- Hayhooks OpenAI-compatible endpoint on port `1416`
- Hayhooks MCP endpoint on port `1417`
- Local Qdrant service on ports `6339` and `6340`
- Auto-loaded starter Haystack pipeline at `pipelines/haystack_rag`
- Persistent data under `./data/open-webui`, `./data/hayhooks`, and `./data/qdrant`

## Default access

- Open WebUI: `http://localhost:3085`
- Hayhooks docs: `http://localhost:1416/docs`
- Hayhooks OpenAI-compatible API: `http://localhost:1416/v1`
- Qdrant HTTP: `http://localhost:6339`

## Included services

- custom `Hayhooks` image with Haystack, Ollama, and Qdrant integrations installed
- official `ghcr.io/open-webui/open-webui:main`
- official `qdrant/qdrant` vector database
- external dependency on `ollama-runtime` through `http://host.docker.internal:11435`

## Starter pipeline scope

The included `haystack_rag` wrapper is intentionally narrow and practical:

- reads local `.txt` files from `registry/recipes/haystack-studio/data/documents`
- chunks and embeds them with the Ollama embedding model
- stores vectors in local Qdrant
- retrieves context for user questions
- answers through an Ollama-backed Haystack generation pipeline
- exposes both `/haystack_rag/run` and OpenAI-compatible chat usage through Hayhooks

This recipe does **not** include:

- a full enterprise Haystack control plane
- built-in user auth or external secret management
- automatic live reindexing when files change
- bundled Ollama runtime or model downloads

## Required configuration

Before first launch:

1. Start `ollama-runtime`.
2. Ensure the shared Ollama runtime has both models pulled:
   - chat model: `qwen3.5:4b`
   - embedding model: `nomic-embed-text`
3. Review `registry/recipes/haystack-studio/.env` if you want different ports, models, or index settings.
4. Place your `.txt` knowledge files under `registry/recipes/haystack-studio/data/documents`.

## Open WebUI connection notes

This recipe sets Open WebUI to talk to Hayhooks through:

- base URL: `http://hayhooks:1416/v1`
- API key: `haystack-studio`

The intended model name for chat requests is `haystack_rag`.

## Persistent data

This recipe stores state under:

- `registry/recipes/haystack-studio/data/documents`
- `registry/recipes/haystack-studio/data/open-webui`
- `registry/recipes/haystack-studio/data/hayhooks`
- `registry/recipes/haystack-studio/data/qdrant`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, Docker build assets, compose definition, starter pipeline files, sample documents, and recipe documentation
- checking editor diagnostics for `recipe.yaml`, `docker-compose.yml`, `Dockerfile`, and `pipelines/haystack_rag/pipeline_wrapper.py`
- confirming Python syntax for the starter pipeline wrapper

Not validated here:

- `docker compose config` or live container startup, because Docker is not available in this Windows workspace
- live Open WebUI to Hayhooks chat flow
- live Ollama embedding/generation behavior against the shared runtime
- large-document indexing performance or retrieval quality

## License notes

- Upstream projects: `deepset-ai/haystack`, `deepset-ai/hayhooks`, `open-webui/open-webui`, `qdrant/qdrant`
- Review each upstream image and package license before production redistribution

## Risk notes

- Successful startup depends on a reachable shared Ollama server and the required models already being present.
- The starter pipeline only indexes `.txt` files; richer formats would require additional converters and dependencies.
- Open WebUI and Hayhooks evolve quickly, so future upstream changes may require environment or wrapper updates.
- This recipe is intended for local experimentation and recipe catalog expansion, not a hardened production deployment.