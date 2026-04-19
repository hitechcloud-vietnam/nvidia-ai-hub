# Langfuse

Practical self-hosted Langfuse stack for NVIDIA AI Hub using the official application image with local PostgreSQL, ClickHouse, Redis, and MinIO dependencies.

## What it provides

- Langfuse web UI on port `3001`
- Background worker for trace ingestion, scoring, exports, and async jobs
- Local PostgreSQL metadata store
- Local ClickHouse analytics store
- Local Redis cache and queue backend
- Local MinIO object storage for uploads and exports

## Default access

- Langfuse UI: `http://localhost:3001`
- MinIO API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`

## Configuration notes

- Update `registry/recipes/langfuse/.env` before first launch.
- Replace `NEXTAUTH_SECRET`, `SALT`, database passwords, Redis password, and MinIO credentials with strong values.
- The initialization variables are optional. Leave them empty if you want to create the organization and project interactively.
- This recipe uses one shared MinIO bucket for events, media, and exports to keep the local deployment simple.
- If your environment requires external storage, external PostgreSQL, or managed Redis, adjust the compose file before production use.

## Persistent data

This recipe stores state under:

- `registry/recipes/langfuse/data/postgres`
- `registry/recipes/langfuse/data/clickhouse`
- `registry/recipes/langfuse/data/redis`
- `registry/recipes/langfuse/data/minio`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the deployment shape with Langfuse self-hosting guidance that expects application plus PostgreSQL, ClickHouse, and Redis dependencies
- wiring a practical local object-storage baseline for uploads and exports

Not validated here:

- live `docker compose up`, database migrations, or first-login flows, because Docker is not available in this Windows workspace
- compatibility of the worker start command with every future upstream image change
- production sizing, external storage hardening, or SSO configuration

## License notes

- Upstream project: `langfuse/langfuse`
- Review the upstream project license and any dependency licenses before production redistribution

## Risk notes

- Langfuse depends on multiple stateful services, so startup and upgrade behavior are more complex than single-container recipes.
- Default placeholder secrets are insecure and must be replaced.
- This local baseline is intended for evaluation and development, not hardened multi-tenant production use.
