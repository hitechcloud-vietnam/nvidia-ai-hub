# Open WebUI RAG Preset

Practical Open WebUI starter for local document chat and retrieval-augmented workflows using the official Open WebUI image with a bundled local Qdrant vector database.

## What it provides

- Open WebUI on port `3083`
- Local Qdrant vector database for indexed document retrieval
- Persistent application state under `./data/open-webui`
- Persistent vector data under `./data/qdrant`
- Pre-wired Qdrant environment variables for Open WebUI RAG
- Easy pairing with the existing `ollama-runtime` recipe for chat models

## Default access

- Web UI: `http://localhost:3083`
- First-run admin onboarding: `http://localhost:3083`
- Qdrant REST API: `http://localhost:6335`
- Qdrant gRPC: `localhost:6336`

## Included services

- `open-webui`: official Open WebUI container
- `qdrant`: local vector database for document embeddings and retrieval

## Required configuration

Before first launch, review `./.env` and change at least:

- `WEBUI_SECRET_KEY`

Review these values if your local runtime layout differs:

- `OLLAMA_BASE_URL`
- `RAG_OLLAMA_BASE_URL`
- `OPEN_WEBUI_PORT`
- `QDRANT_HTTP_PORT`
- `QDRANT_GRPC_HOST_PORT`

## Scope of this preset

This recipe intentionally provides a practical RAG-focused subset for this repository:

- uses the official `ghcr.io/open-webui/open-webui:main` image
- uses local Qdrant instead of the default embedded Chroma database
- assumes model inference is provided by the separate `ollama-runtime` recipe or another reachable OpenAI-compatible / Ollama endpoint
- keeps advanced sidecars such as Tika, Docling, Playwright, Redis session clustering, and bundled Ollama-in-container out of scope

By default, Open WebUI still uses its built-in local sentence-transformers embedding model for RAG unless you explicitly change the embedding engine in the admin settings or via environment variables.

## Persistent data

This recipe stores data under:

- `registry/recipes/openwebui-rag-preset/data/open-webui`
- `registry/recipes/openwebui-rag-preset/data/qdrant`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the deployment with the official Open WebUI Docker image and documented persistent data mount
- wiring Open WebUI to local Qdrant through supported environment variables
- exposing the expected local ports `3083`, `6335`, and `6336`
- rendering `docker compose config` successfully for the recipe

Not validated here:

- full runtime startup and first-run login flow on this Windows workspace
- live document upload, embedding generation, or end-to-end retrieval responses
- optional Docling, Tika, web search, pipelines, Playwright, or external reranker integrations
- multi-node deployment, enterprise auth, or remote storage backends

## License notes

- Upstream project: `open-webui/open-webui`
- Upstream license: mixed licensing with Open WebUI branding and commercial terms for portions of the project
- Review the upstream `LICENSE` and `LICENSE_HISTORY` before redistribution, white-labeling, or commercial packaging

## Risk notes

- The `:main` container tag tracks upstream changes and can introduce breaking behavior over time.
- Open WebUI can download embedding and auxiliary model assets on first use, so cold start behavior may be slower than the compose definition suggests.
- Exposing both the Web UI and Qdrant locally increases attack surface; keep the stack on trusted networks.
