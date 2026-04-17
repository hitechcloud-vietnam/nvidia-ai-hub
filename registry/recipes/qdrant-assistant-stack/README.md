# Qdrant Assistant Stack

Qdrant vector database preset for DGX Spark users who want a practical local assistant retrieval foundation with the official Qdrant service, persistent storage, snapshot support, and the built-in web UI exposed through the same HTTP endpoint.

## What it provides

- Qdrant HTTP API on port `6333`
- Qdrant gRPC API on port `6334`
- Qdrant built-in web UI on `http://localhost:3093`
- Qdrant health endpoint on `http://localhost:6333/healthz`
- Persistent local storage and snapshot directories under `./data/*`
- A practical vector database target for RAG apps, agent systems, embedding pipelines, and search prototypes

## Default access

- Web UI: `http://localhost:3093`
- HTTP API: `http://localhost:6333`
- gRPC API: `localhost:6334`
- Health: `http://localhost:6333/healthz`
- Readiness: `http://localhost:6333/readyz`

## Included services

- `qdrant`: official Qdrant vector database container with built-in web UI
- external dependency on `ollama-runtime` for surrounding applications that want local embedding or LLM generation against vectors stored in Qdrant

## Scope of this preset

This recipe intentionally provides a narrow, practical assistant-ready vector stack baseline:

- starts a single-node Qdrant service with persistent local storage
- exposes both HTTP and gRPC APIs for surrounding apps and SDKs
- preserves snapshots separately from the main storage path
- exposes the built-in Qdrant web UI for collection inspection, point management, and API exploration
- keeps the stack generic so Flowise, Langflow, LlamaIndex, Haystack, custom Python apps, or future catalog entries can use Qdrant as their vector backend

This preset does **not** include:

- automatic collection creation, embedding jobs, or document ingestion pipelines
- bundled application servers that write vectors into Qdrant for you
- JWT generation workflows, reverse proxy hardening, or production backup automation
- distributed Qdrant clustering or multi-node consensus deployment
- validated end-to-end assistant quality claims in this workspace

## Required configuration

Before first launch:

1. Review `registry/recipes/qdrant-assistant-stack/.env`.
2. Optionally set `QDRANT_API_KEY` if you want authenticated API access.
3. Launch the recipe.
4. Connect your application or workflow tool to `http://localhost:6333` or `qdrant:6333` inside the compose network.

## Qdrant and application notes

- Qdrant persists data under `/qdrant/storage`, so this recipe mounts `registry/recipes/qdrant-assistant-stack/data/storage` there.
- Qdrant stores snapshots under `/qdrant/snapshots`, so this recipe mounts a dedicated snapshots directory for cleaner backup handling.
- The built-in web UI is served from the same Qdrant HTTP service. This recipe publishes that endpoint twice so the UI can be opened on `3093` while the API remains available on `6333`.
- `OLLAMA_BASE_URL` is included in the environment template as a convenience note for surrounding apps, but Qdrant itself does not consume that variable directly in this compose stack.
- For production-grade security, reviewers should consider enabling and testing API-key-based access controls before broader exposure.

## Persistent data

This recipe stores state under:

- `registry/recipes/qdrant-assistant-stack/data/storage`
- `registry/recipes/qdrant-assistant-stack/data/snapshots`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, persistent storage layout, config file, and documentation
- aligning the storage and snapshot mounts with upstream Qdrant Docker guidance for `/qdrant/storage` and `/qdrant/snapshots`
- aligning HTTP, gRPC, and health endpoint expectations with upstream Qdrant defaults and health paths
- checking editor diagnostics for the newly created recipe files

Not validated here:

- live `docker compose up`, web UI access, collection creation, or vector queries, because Docker is not available in this Windows workspace
- API-key-protected workflows beyond the documented environment placeholder
- snapshot restore, clustering, or distributed consensus behavior
- compatibility with every downstream RAG framework

## License notes

- Upstream project: `qdrant/qdrant`
- Review Qdrant image licensing and security guidance separately before production redistribution or broader exposure

## Risk notes

- By default, Qdrant can be exposed without authentication if `QDRANT_API_KEY` is left empty.
- This preset intentionally stops at infrastructure bring-up and does not claim validated ingestion, ranking, or retrieval quality.
- Publishing the same HTTP service on both `6333` and `3093` is convenient for local access, but reviewers should decide whether they want both ports exposed long term.
- Large vector collections and snapshots can consume storage quickly if retention is not managed.
