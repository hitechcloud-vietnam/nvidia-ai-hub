# Flowise RAG Preset

Official-image Flowise preset for NVIDIA GPUs users who want a practical starting point for document ingestion, chatflow-based RAG experiments, agent workflows, and shared Ollama connectivity without building a custom image.

## What it provides

- Flowise web UI on port `3089`
- Official `flowiseai/flowise:latest` container
- Persistent local Flowise state under `./data/flowise`
- SQLite-backed metadata storage, local upload storage, file-based secrets, and local logs inside the mounted Flowise home directory
- Default pairing to the shared `ollama-runtime` recipe through `http://host.docker.internal:11435`
- A practical base for building RAG chatflows, document stores, agent flows, API keys, and workflow automations in the Flowise UI

## Default access

- Web UI: `http://localhost:3089`
- Main app/API base: `http://localhost:3089/api/v1`
- First-run setup and login: `http://localhost:3089`

## Included services

- `flowise`: official Flowise application container
- external dependency on `ollama-runtime` through `http://host.docker.internal:11435`

## Scope of this preset

This recipe intentionally provides a practical RAG-focused baseline:

- uses the official Flowise image instead of a custom build
- persists the whole Flowise home directory so local database files, logs, secrets, uploads, and app-managed runtime assets survive restarts
- defaults to local SQLite storage for faster bring-up in this catalog
- assumes chat and embedding inference come from the separate `ollama-runtime` recipe or another reachable Ollama-compatible endpoint
- leaves chatflow design, document store creation, embedding selection, and API key generation to the Flowise UI after first launch

This preset does **not** include:

- a bundled vector database such as Qdrant, Milvus, or OpenSearch
- a prebuilt starter flow JSON or auto-import bootstrap logic
- reverse proxy, TLS termination, SSO, or external secret-management systems
- worker-mode queue deployment, Redis-backed scaling, or HA clustering
- preloaded Ollama models

## Required configuration

Before first launch:

1. Start `ollama-runtime`.
2. Ensure the shared Ollama runtime has the models you want to use for chat and embeddings.
3. Review `registry/recipes/flowise-rag-preset/.env` and change at minimum:
   - `FLOWISE_SECRETKEY_OVERWRITE`
   - `TOKEN_HASH_SECRET`
   - `EXPRESS_SESSION_SECRET`
   - `JWT_AUTH_TOKEN_SECRET`
   - `JWT_REFRESH_TOKEN_SECRET`
4. Launch the recipe and complete first-run Flowise setup in the web UI.
5. In Flowise, create credentials and chatflows that point to your Ollama endpoint if the default `OLLAMA_BASE_URL` differs from your Docker networking layout.

## Ollama connection notes

- This preset exposes `OLLAMA_BASE_URL=http://host.docker.internal:11435` by default to align with the shared runtime recipe pattern already used in this repository.
- If `host.docker.internal` does not resolve on your host, change `OLLAMA_BASE_URL` to a reachable address before launch.
- Flowise model choice, embeddings, retrievers, and vector stores are configured per credential and per flow in the UI.

## Persistent data

This recipe stores state under:

- `registry/recipes/flowise-rag-preset/data/flowise/database.sqlite`
- `registry/recipes/flowise-rag-preset/data/flowise/storage`
- `registry/recipes/flowise-rag-preset/data/flowise/logs`
- `registry/recipes/flowise-rag-preset/data/flowise/encryption.key`
- additional auth secret files and application-managed runtime assets created by Flowise in the same mounted directory

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, persistent storage layout, and documentation
- aligning the preset with upstream Flowise Docker guidance for persisted database, logs, secret key, and local storage paths
- matching documented Flowise environment-variable families for port, SQLite storage, blob storage, logging, secret persistence, and Ollama connectivity
- checking editor diagnostics for `recipe.yaml`, `.env`, `.env.example`, `docker-compose.yml`, and `README.md`

Not validated here:

- live `docker compose up`, first-run login, or chatflow execution, because Docker is not available in this Windows workspace
- live document upload, vector indexing, or RAG answer quality
- API key creation and external `/api/v1` calls against a running instance
- queue mode, worker mode, enterprise features, or external database backends

## License notes

- Upstream project: `FlowiseAI/Flowise`
- Review the upstream repository license and published container terms before redistribution or production packaging

## Risk notes

- The `latest` image tag can change behavior over time and may require env or UI workflow adjustments.
- Flowise can execute user-configured tools, loaders, and integrations, so reviewers should treat Custom Tool and external dependency settings as a security-sensitive surface.
- Large document uploads and repeated experiments can grow the mounted Flowise directory quickly because database files, uploads, logs, and secret files are all persisted together.
- This preset is a practical catalog starter, not a hardened production architecture.