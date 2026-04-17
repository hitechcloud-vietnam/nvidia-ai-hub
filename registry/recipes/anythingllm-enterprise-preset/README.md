# AnythingLLM Enterprise Preset

Official-image AnythingLLM preset for DGX Spark teams that want a stronger default starting point for role-based access, persistent local state, document workflows, agent features, and shared Ollama connectivity.

## What it provides

- AnythingLLM web application on port `3088`
- Official `mintplexlabs/anythingllm` container with persistent mounted storage
- Default pairing to the shared `ollama-runtime` recipe through `host.docker.internal:11435`
- Built-in LanceDB and SQLite-backed local storage inside the mounted AnythingLLM storage directory
- Access to AnythingLLM capabilities such as RAG workspaces, agents, flows, embedded chat widgets, MCP-compatible tooling, and document ingestion
- A practical base for switching from single-user setup to multi-user role-based access in the Docker deployment

## Default access

- Web UI: `http://localhost:3088`
- API health check: `http://localhost:3088/api/ping`
- First-run setup: `http://localhost:3088`

## Included services

- `anythingllm`: official `mintplexlabs/anythingllm:v1.12.0` image
- external dependency on `ollama-runtime` through `http://host.docker.internal:11435`

## Scope of this preset

This recipe intentionally focuses on a practical enterprise-oriented baseline:

- uses the official self-hosted Docker image instead of a custom fork
- keeps all persistent state under `registry/recipes/anythingllm-enterprise-preset/data/storage`
- defaults to Ollama for both chat and embeddings, while still allowing reconfiguration to other supported providers inside the app
- preserves storage for documents, vector cache, local database files, plugins, MCP configuration, agent flows, and other runtime assets managed by AnythingLLM
- supports Docker-only security features such as password protection and multi-user mode through the application UI

This preset does **not** include:

- an external PostgreSQL or PGVector deployment
- SSO, reverse proxy, TLS termination, or external secret stores
- bundled backup automation or HA clustering
- pre-created admin users via compose-time bootstrapping
- live provisioning of Ollama models

## Required configuration

Before first launch:

1. Start `ollama-runtime`.
2. Ensure the shared Ollama runtime has at least one chat model and one embedding model available. The defaults in this recipe assume:
   - chat model: `qwen3.5:4b`
   - embedding model: `nomic-embed-text`
3. Review `registry/recipes/anythingllm-enterprise-preset/.env` and change at minimum:
   - `JWT_SECRET`
   - any ports or model preferences that differ from your environment
4. Launch the recipe and complete first-run onboarding in the web UI.
5. If you need role-based access, enable multi-user mode from the security settings and create the first admin account.

## Security and operations notes

- AnythingLLM exposes both single-user password protection and Docker-only multi-user mode in the UI.
- Upstream documents that multi-user mode cannot be reverted back to single-user mode.
- This recipe disables telemetry by default through `DISABLE_TELEMETRY=true`; review that choice against your support and observability requirements.
- If you run on Linux, verify that the mounted storage path permissions match the container user expectations to avoid ownership issues.
- If your Docker host cannot resolve `host.docker.internal`, adjust the Ollama URLs in `.env` to a reachable host address.

## Persistent data

This recipe stores state under:

- `registry/recipes/anythingllm-enterprise-preset/data/storage/anythingllm.db`
- `registry/recipes/anythingllm-enterprise-preset/data/storage/documents`
- `registry/recipes/anythingllm-enterprise-preset/data/storage/vector-cache`
- `registry/recipes/anythingllm-enterprise-preset/data/storage/lancedb`
- `registry/recipes/anythingllm-enterprise-preset/data/storage/plugins`
- other runtime-managed files created by AnythingLLM in the same storage root

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, persistent storage layout, and documentation
- aligning the deployment with upstream AnythingLLM Docker quickstart guidance for mounted storage and `/app/server/.env`
- confirming the preset uses documented Docker-only security features and official image tags
- checking editor diagnostics for `recipe.yaml`, `.env`, `.env.example`, `docker-compose.yml`, and `README.md`

Not validated here:

- live `docker compose up`, first-run onboarding, or multi-user enablement, because Docker is not available in this Windows workspace
- live connectivity to `ollama-runtime`
- document ingestion, embedding generation, agent execution, MCP integrations, or embedded widget flows
- external provider reconfiguration such as OpenAI, pgvector, Qdrant cloud, Weaviate, or SSO extensions

## License notes

- Upstream project: `Mintplex-Labs/anything-llm`
- Upstream documentation indicates MIT licensing for the self-hosted project, but reviewers should still confirm current upstream licensing and image terms before redistribution or commercial packaging

## Risk notes

- The preset depends on a reachable model provider; the default assumes the separate `ollama-runtime` recipe is already running and reachable from Docker.
- Multi-user mode is a one-way operational change according to upstream documentation.
- Large document corpora can grow the mounted storage directory quickly because documents, vectors, caches, flows, and plugin assets are persisted together.
- Even with a pinned image tag, upstream application behavior and supported environment variables can evolve across releases.
