# OpenSearch AI Assistant

OpenSearch and OpenSearch Dashboards preset for NVIDIA GPUs users who want a practical local foundation for AI-assisted search, PPL query assist, ML Commons experimentation, and shared Ollama connectivity without claiming a fully pre-wired agent deployment.

## What it provides

- OpenSearch single-node cluster on API port `9201`
- OpenSearch Dashboards web UI on port `3091`
- Persistent OpenSearch data under `./data/opensearch`
- OpenSearch ML Commons settings enabled for remote inference, connectors, and agent-framework experiments
- Dashboards query-enhancements configuration for PPL query-assist agent discovery
- Shared-host access to `ollama-runtime` through `http://host.docker.internal:11435`
- A practical baseline for creating connectors, registering remote models, deploying agents, and exploring AI-assisted search workflows manually

## Default access

- Dashboards UI: `http://localhost:3091`
- OpenSearch API: `http://localhost:9201`
- Default username: `admin`
- Default password source: `OPENSEARCH_INITIAL_ADMIN_PASSWORD` in `registry/recipes/opensearch-ai-assistant/.env`

## Included services

- `opensearch`: official OpenSearch single-node container
- `dashboards`: official OpenSearch Dashboards container with query-assist configuration
- external dependency on `ollama-runtime` through `http://host.docker.internal:11435` when you create ML Commons connectors for local models

## Scope of this preset

This recipe intentionally provides an assistant-ready baseline instead of an over-automated bootstrap:

- starts a local OpenSearch cluster and Dashboards UI with persistent data
- enables ML Commons settings commonly needed for remote inference and agent experiments
- preconfigures Dashboards query-assist language mapping for the default PPL agent config names used upstream
- leaves connector creation, model registration, model deployment, and agent creation to manual API or Dashboards workflows after first launch
- keeps security expectations explicit by requiring a real admin password in the environment file

This preset does **not** include:

- automatic creation of ML Commons connectors, models, or agent IDs during container startup
- a guaranteed working chat sidecar or fully wired Dashboards chat plugin path
- TLS termination, SSO, reverse proxy hardening, or multi-node production topology
- automatic index templates, document loaders, or prebuilt RAG pipelines
- preloaded Ollama models

## Required configuration

Before first launch:

1. Review `registry/recipes/opensearch-ai-assistant/.env`.
2. Change `OPENSEARCH_INITIAL_ADMIN_PASSWORD` and keep `DASHBOARDS_PASSWORD` aligned with it.
3. Start `ollama-runtime` if you plan to create remote connectors against a local Ollama endpoint.
4. Launch the recipe.
5. Sign in to Dashboards and complete the ML Commons bootstrap work manually.

## ML Commons and Ollama notes

This preset is designed around the practical upstream pattern where Dashboards query assist and chat features depend on ML Commons configuration that is specific to each running cluster.

Common post-launch flow:

1. Create a remote connector that targets `http://host.docker.internal:11435` or another reachable OpenAI-compatible/Ollama endpoint.
2. Register a model against that connector with the ML Commons API.
3. Deploy the model.
4. Create the agent configs required for query assist, typically using config names such as:
   - `os_query_assist_ppl`
   - `os_query_time_range_parser`
5. Optionally create additional agents for chat or summarization if your Dashboards feature set and plugins support them.

Useful API families to review after launch:

- `POST /_plugins/_ml/connectors/_create`
- `POST /_plugins/_ml/models/_register`
- `POST /_plugins/_ml/models/<MODEL_ID>/_deploy`
- `POST /_plugins/_ml/agents/_register`
- `GET /_plugins/_ml/config/<CONFIG_NAME>`

## Persistent data

This recipe stores state under:

- `registry/recipes/opensearch-ai-assistant/data/opensearch`
- `registry/recipes/opensearch-ai-assistant/config/opensearch_dashboards.yml`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, persistent storage layout, Dashboards config, and documentation
- aligning OpenSearch single-node settings with the local `onyx` recipe and upstream OpenSearch container patterns
- aligning Dashboards configuration with upstream environment/config naming for `opensearch.hosts`, credentials, SSL verification mode, data-source enablement, and query-assist configuration
- documenting ML Commons bootstrap as a manual step instead of claiming unverified automatic agent provisioning

Not validated here:

- live `docker compose up`, cluster login, connector creation, or Dashboards query-assist behavior, because Docker is not available in this Windows workspace
- actual ML Commons connector registration against Ollama or another inference endpoint
- chat plugin enablement with a real `mlCommonsAgentId`
- production hardening, TLS, or multi-node behavior

## License notes

- Upstream projects: `opensearch-project/OpenSearch` and `opensearch-project/OpenSearch-Dashboards`
- Review upstream licensing and container terms before redistribution or production packaging

## Risk notes

- OpenSearch and Dashboards AI-assist features are version-sensitive and may depend on plugin capabilities or ML Commons resources that change across releases.
- This recipe intentionally avoids pretending that assistant chat is ready immediately after startup; reviewers should expect manual post-launch setup.
- Exposing the OpenSearch API on `9201` is useful for bootstrap and debugging, but it increases the importance of replacing default credentials.
- Single-node local settings are suitable for workstation experimentation, not hardened production deployments.
