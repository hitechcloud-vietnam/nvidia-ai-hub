# LibreChat

Official image-based LibreChat stack for DGX Spark.

## What it provides

- LibreChat web UI on port `3080`
- Built-in MongoDB, Meilisearch, pgvector, and RAG API services
- Persistent bind mounts for uploads, logs, images, MongoDB, Meilisearch, and pgvector state
- `.env`-driven provider keys and deployment settings

## Default access

- Web UI: `http://localhost:3080`
- Health endpoint: `http://localhost:3080/api/health`

## Included services

- `api`: main LibreChat application
- `mongodb`: primary application database
- `meilisearch`: search index for conversations and content
- `vectordb`: pgvector database for retrieval data
- `rag_api`: retrieval / embeddings sidecar used by LibreChat

## Required configuration

Before first launch, update `./.env` with strong values for:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CREDS_KEY`
- `CREDS_IV`
- `MEILI_MASTER_KEY`

Then set at least one provider credential such as:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_KEY`
- `ASSISTANTS_API_KEY`

## Security notes

LibreChat can connect to remote providers, tools, MCP servers, actions, and optional internal services. Review configuration carefully before exposing it outside localhost. Misconfigured MCP, action, or SSRF-related settings can widen network reach and data exposure.

This recipe intentionally starts with the smaller official compose subset and leaves advanced `librechat.yaml`, Redis, OAuth, SAML, LDAP, and custom endpoint policies for follow-up hardening.
