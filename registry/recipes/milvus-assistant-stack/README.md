# Milvus Assistant Stack

Milvus standalone preset for NVIDIA GPUs users who want a practical local vector database foundation for assistant retrieval experiments, embedding-backed search, collection management, and shared Ollama-connected applications.

## What it provides

- Milvus standalone gRPC endpoint on port `19531`
- Milvus health endpoint on port `9092`
- Attu web UI on port `3092`
- Embedded supporting services for Milvus metadata and object storage:
  - `etcd`
  - `minio`
- Persistent storage for Milvus, etcd, MinIO, and Attu state under `./data/*`
- A practical local target for RAG apps, agent systems, and embedding pipelines that need a Milvus backend

## Default access

- Attu UI: `http://localhost:3092`
- Milvus gRPC endpoint: `localhost:19531`
- Milvus health endpoint: `http://localhost:9092/healthz`
- MinIO API: `http://localhost:9002`
- MinIO console: `http://localhost:9003`

## Included services

- `milvus`: official Milvus standalone container
- `etcd`: metadata engine required by Milvus standalone
- `minio`: object storage required by Milvus standalone persistence layout
- `attu`: web-based Milvus management UI
- external dependency on `ollama-runtime` for applications that want local embedding or LLM generation against the vectors stored in Milvus

## Scope of this preset

This recipe intentionally provides a practical assistant-ready vector stack baseline:

- starts Milvus in standalone mode with the supporting etcd and MinIO services Milvus expects
- adds Attu so collections, schemas, data, and vector-search operations can be inspected from a browser
- persists all major service data locally for restart-safe experimentation
- keeps the stack generic so Langflow, Flowise, AnythingLLM, custom apps, or future catalog entries can connect to Milvus as their vector backend

This preset does **not** include:

- automatic collection creation, embedding jobs, or document ingestion pipelines
- preconfigured Ollama embedding bootstrap logic inside Milvus itself
- a bundled application server that writes vectors into Milvus on your behalf
- TLS, reverse proxy hardening, multi-node Milvus clustering, or backup automation
- a claim that Attu's built-in AI agent features are fully production-ready in this workspace

## Required configuration

Before first launch:

1. Review `registry/recipes/milvus-assistant-stack/.env`.
2. Change `MINIO_SECRET_KEY`.
3. Optionally set `MILVUS_USERNAME` and `MILVUS_PASSWORD` if your Milvus deployment flow requires Attu to preconfigure authenticated access.
4. Launch the recipe.
5. Connect your application or workflow tool to `localhost:19531` or `milvus:19530` inside the compose network.

## Attu and application notes

- Attu automatically creates a connection on first launch when `MILVUS_ADDRESS` is provided.
- `MILVUS_ADDRESS` must be reachable from inside the Attu container, so this recipe uses `milvus:19530` instead of `localhost`.
- Attu persists its local connection and preference database under `registry/recipes/milvus-assistant-stack/data/attu`.
- If you use Flowise, Langflow, or custom Python services, point them at the Milvus endpoint and manage embeddings through the application layer.
- `OLLAMA_BASE_URL` is included in the environment template as a convenience note for surrounding apps, but Milvus itself does not consume that variable directly in this compose stack.

## Persistent data

This recipe stores state under:

- `registry/recipes/milvus-assistant-stack/data/milvus`
- `registry/recipes/milvus-assistant-stack/data/etcd`
- `registry/recipes/milvus-assistant-stack/data/minio`
- `registry/recipes/milvus-assistant-stack/data/attu`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, persistent storage layout, and documentation
- aligning the Milvus standalone topology with upstream Milvus expectations for standalone mode using `etcd`, `minio`, and Milvus service ports
- aligning the Milvus health endpoint and persistence paths with existing Milvus usage patterns already present in this repository
- aligning Attu environment variables with current upstream Docker guidance for `MILVUS_ADDRESS`, `MILVUS_NAME`, `MILVUS_DATABASE`, credentials, and `ATTU_DB_PATH`

Not validated here:

- live `docker compose up`, Attu login, collection creation, or vector search, because Docker is not available in this Windows workspace
- authenticated Milvus flows beyond the documented environment placeholders
- ingestion performance, indexing behavior, or compatibility with every downstream RAG framework
- production clustering, TLS, or backup/restore operations

## License notes

- Upstream Milvus project: `milvus-io/milvus`
- Upstream Attu image: `zilliz/attu`
- Attu versions `2.6.0` and above are distributed under a proprietary license; review upstream terms before redistribution or production packaging

## Risk notes

- Milvus standalone depends on etcd and MinIO, so storage corruption or misconfiguration in either supporting service can affect the overall stack.
- Attu version compatibility can vary across Milvus releases; reviewers should verify UI behavior against the specific Milvus image tag they plan to keep.
- This preset intentionally stops at infrastructure bring-up and does not claim validated end-to-end assistant ingestion or retrieval quality.
- Port exposure for Milvus, MinIO, and Attu is useful for local integration work but should be reviewed carefully before broader network exposure.
