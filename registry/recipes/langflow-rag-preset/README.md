# Langflow RAG Preset

Official-image Langflow preset for NVIDIA GPUs users who want a practical starting point for local RAG pipelines, agent orchestration, visual flow development, and shared Ollama connectivity without maintaining a custom image.

## What it provides

- Langflow web UI on port `3090`
- Official `langflowai/langflow:latest` container
- Persistent Langflow config and runtime state under `./data/langflow`
- Built-in local database persistence through `LANGFLOW_SAVE_DB_IN_CONFIG_DIR=true`
- Default API-key-ready access for `/api/v1` automation
- Default pairing to the shared `ollama-runtime` recipe through `http://host.docker.internal:11435`
- A practical base for RAG flows, agent workflows, prompt chaining, document ingestion, and OpenAI-compatible testing against local models

## Default access

- Web UI: `http://localhost:3090`
- API base: `http://localhost:3090/api/v1`
- First-run setup and login: `http://localhost:3090`

## Included services

- `langflow`: official Langflow application container
- external dependency on `ollama-runtime` through `http://host.docker.internal:11435`

## Scope of this preset

This recipe intentionally provides a practical RAG-focused baseline:

- uses the official Langflow image instead of a custom build
- persists the application config directory so flows, local database files, uploads, logs, variables, monitor data, and secret material survive restarts
- defaults to built-in config-directory persistence instead of requiring PostgreSQL on first launch
- exposes environment-based API-key support for automation and client integration testing
- assumes local chat and embedding inference come from the separate `ollama-runtime` recipe or another reachable OpenAI-compatible / Ollama-compatible endpoint
- keeps actual flow design, variable wiring, vector-store choice, and provider credentials inside the Langflow UI after launch

This preset does **not** include:

- a bundled PostgreSQL deployment
- a bundled vector database such as Qdrant, Milvus, or OpenSearch
- reverse proxy, TLS termination, SSO, or external secret stores
- custom components, preloaded starter flows, or automated flow import
- HA clustering, queue workers, or production-grade horizontal scaling
- preloaded Ollama models

## Required configuration

Before first launch:

1. Start `ollama-runtime`.
2. Ensure the shared Ollama runtime has the models you want to use for chat and embeddings.
3. Review `registry/recipes/langflow-rag-preset/.env` and change at minimum:
   - `LANGFLOW_SECRET_KEY`
   - `LANGFLOW_SUPERUSER_PASSWORD`
   - `LANGFLOW_API_KEY`
4. Launch the recipe and sign in with the configured superuser credentials.
5. In Langflow, create or update flows to use your preferred local model endpoint, embeddings, and retrievers.

## Ollama and API notes

- This preset exposes both `OLLAMA_BASE_URL` and `OPENAI_API_BASE` so flows can be wired either to Ollama-native integrations or to OpenAI-compatible endpoints backed by the shared runtime.
- The default `OPENAI_API_KEY=ollama` is a compatibility placeholder commonly used with local OpenAI-compatible runtimes.
- If `host.docker.internal` does not resolve on your host, change the endpoint variables before launch.
- Langflow API clients can use `x-api-key: <LANGFLOW_API_KEY>` against `http://localhost:3090/api/v1`.

## Persistent data

This recipe stores state under:

- `registry/recipes/langflow-rag-preset/data/langflow`
- local database files created by Langflow in that config directory
- uploaded files, logs, variables, monitor data, and runtime-managed assets created by Langflow in the same directory

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, persistent storage layout, and documentation
- aligning the preset with upstream Langflow Docker and environment-variable guidance for config-directory persistence, API key configuration, secret key configuration, and official-image deployment
- matching documented Langflow environment-variable families for host/port, config directory, database persistence, auth, API key source, upload limits, logging, and OpenAI-compatible runtime access
- checking editor diagnostics for `recipe.yaml`, `.env`, `.env.example`, `docker-compose.yml`, and `README.md`

Not validated here:

- live `docker compose up`, first-run login, or flow execution, because Docker is not available in this Windows workspace
- live document upload, vector indexing, or RAG output quality
- API calls against a running `/api/v1` instance
- PostgreSQL-backed deployment, multi-instance scaling, or enterprise-only deployment patterns

## License notes

- Upstream project: `langflow-ai/langflow`
- Review the upstream repository license and published container terms before redistribution or production packaging

## Risk notes

- The `latest` image tag can change behavior over time and may require env or UI workflow adjustments.
- Langflow can execute user-defined flows, tools, and integrations, so custom components, secrets, and external connectors should be treated as a security-sensitive surface.
- Large experiments and uploaded assets can grow the mounted config directory quickly because flows, logs, local database files, and runtime artifacts are persisted together.
- This preset is a practical catalog starter, not a hardened production architecture.