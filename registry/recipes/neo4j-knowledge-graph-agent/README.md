# Neo4j Knowledge Graph Agent

Neo4j Community preset for DGX Spark users who want a practical local graph database foundation for knowledge graph experiments, Cypher exploration, graph-RAG prototypes, and agent workflows that need a persistent property graph backend.

## What it provides

- Neo4j Browser on port `3094`
- Neo4j HTTP endpoint on port `7475`
- Neo4j Bolt endpoint on port `7688`
- APOC plugin bootstrap for common graph utility procedures
- Persistent graph data, logs, import assets, and plugins under `./data`, `./logs`, `./import`, and `./plugins`
- A practical local target for graph extraction, entity linking, graph analytics, and graph-backed assistant workflows

## Default access

- Neo4j Browser: `http://localhost:3094/browser/`
- Neo4j HTTP endpoint: `http://localhost:7475`
- Neo4j Bolt endpoint: `bolt://localhost:7688`
- Default username: `neo4j`
- Default password: defined in `registry/recipes/neo4j-knowledge-graph-agent/.env`

## Included services

- `neo4j`: official Neo4j Community container with Browser and plugin bootstrap
- external dependency on `ollama-runtime` for surrounding graph-RAG or agent applications that want local LLM or embedding integration against the stored graph

## Scope of this preset

This recipe intentionally provides a practical local graph baseline:

- starts a single-node Neo4j database with Browser enabled
- exposes Bolt for graph applications and Cypher clients
- enables APOC procedures commonly used for import, export, transformation, and graph utility tasks
- preserves graph state, logs, and importable files across restarts
- keeps the stack generic so LangChain, LlamaIndex, GraphRAG pipelines, custom Python services, or future catalog entries can use Neo4j as their graph backend

This preset does **not** include:

- automatic document-to-graph extraction pipelines
- bundled LLM orchestration, embeddings, or graph-RAG application servers
- Neo4j Enterprise clustering, backups, Bloom, or Graph Data Science enterprise packaging
- TLS hardening, reverse proxy setup, or SSO integration
- validated end-to-end knowledge graph agent quality claims in this workspace

## Required configuration

Before first launch:

1. Review `registry/recipes/neo4j-knowledge-graph-agent/.env`.
2. Change `NEO4J_AUTH` to a strong password.
3. Launch the recipe.
4. Connect your application to `bolt://localhost:7688` or `neo4j://neo4j:7687` inside the compose network.
5. Place CSV, JSON, or other importable graph source files under `registry/recipes/neo4j-knowledge-graph-agent/import` if you plan to use Neo4j import procedures.

## Neo4j and application notes

- Neo4j Browser is served by the same HTTP service on container port `7474`; this recipe publishes it on host port `3094` through the same HTTP listener exposed on `7475`.
- The host-facing Browser URL uses the same underlying Neo4j HTTP endpoint, so Browser and REST-style endpoints are both available after startup.
- APOC is enabled through `NEO4J_PLUGINS` and permissive APOC procedure settings to make local graph ingestion and transformation experiments easier.
- `OLLAMA_BASE_URL` is included in the environment template as a convenience note for surrounding applications, but Neo4j itself does not consume that variable directly in this compose stack.
- If you build graph-RAG flows on top of this recipe, keep embeddings, extraction, and retrieval orchestration in the application layer rather than expecting Neo4j to provide that automatically.

## Persistent data

This recipe stores state under:

- `registry/recipes/neo4j-knowledge-graph-agent/data`
- `registry/recipes/neo4j-knowledge-graph-agent/logs`
- `registry/recipes/neo4j-knowledge-graph-agent/import`
- `registry/recipes/neo4j-knowledge-graph-agent/plugins`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, persistent directory layout, and documentation
- aligning Neo4j Browser and Bolt ports with upstream Neo4j Docker defaults for HTTP `7474` and Bolt `7687`
- aligning authentication and plugin environment patterns with upstream Neo4j Docker image conventions for `NEO4J_AUTH` and `NEO4J_PLUGINS`
- checking editor diagnostics for the newly created recipe files

Not validated here:

- live `docker compose up`, Browser login, Cypher execution, or APOC procedure execution, because Docker is not available in this Windows workspace
- graph import throughput, plugin download behavior, or compatibility with every downstream graph-RAG framework
- enterprise-only features such as clustering, advanced backup flows, or licensed Neo4j add-ons
- end-to-end agent behavior on top of the graph database

## License notes

- Upstream project: `neo4j/docker-neo4j`
- This recipe targets Neo4j Community image usage; review upstream Neo4j licensing terms before redistribution or production deployment
- Some Neo4j plugins and commercial Neo4j features require separate licensing review and should not be assumed to be covered by this preset

## Risk notes

- This preset is infrastructure-first and does not by itself create a knowledge graph or agent workflow.
- APOC procedure enablement is convenient for local experimentation but expands the available procedure surface and should be reviewed carefully before broader exposure.
- Plugin download and compatibility can vary across Neo4j image tags, so reviewers should verify the selected image tag if they plan to pin it long term.
- Port exposure for Browser and Bolt is useful for local integration work but should be reviewed before broader network exposure.
