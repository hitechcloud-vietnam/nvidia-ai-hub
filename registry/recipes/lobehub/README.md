# LobeHub

Practical self-hosted LobeHub AI workspace for NVIDIA AI Hub using the official image, local PostgreSQL with PGVector, Redis, and RustFS-compatible S3 object storage.

## What it provides

- LobeHub web UI on port `3210`
- Local PostgreSQL with PGVector for durable application and embedding-related state
- Local Redis for cache and asynchronous coordination
- Local S3-compatible object storage for uploaded files and assistant assets

## Default access

- LobeHub UI: `http://localhost:3210`
- RustFS S3 endpoint: `http://localhost:9000`
- RustFS console: `http://localhost:9001`

## Configuration notes

- Update `registry/recipes/lobehub/.env` before first launch.
- Replace all placeholder secrets before exposing this stack beyond a trusted local environment.
- Upstream guidance has moved away from MinIO for some deployments; this recipe uses a RustFS-compatible S3 baseline to stay aligned with recent public guidance.
- Keep `APP_URL`, `S3_PUBLIC_DOMAIN`, and related hostnames aligned if you change ports or add a reverse proxy.

## Persistent data

This recipe stores state under:

- `registry/recipes/lobehub/data/postgres`
- `registry/recipes/lobehub/data/redis`
- `registry/recipes/lobehub/data/rustfs`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the stack shape with current LobeHub self-hosting expectations around PostgreSQL/PGVector, Redis, and S3-compatible object storage
- checking that environment wiring, ports, and persistent bind mounts are internally consistent

Not validated here:

- live `docker compose up`, login flows, model-provider setup, or file uploads, because Docker is not available in this Windows workspace
- compatibility with every optional upstream integration, reverse-proxy pattern, or storage backend
- exact RustFS environment compatibility for every future upstream storage recommendation change

## License notes

- Upstream project: `lobehub/lobe-chat`
- Review upstream licensing and feature boundaries before production redistribution.

## Risk notes

- This stack is more complex than a single-container chat UI and has several critical secrets.
- Incorrect storage endpoint or public-domain configuration can break uploads and background workflows.
- Production deployments need stronger network, backup, and secret-management controls than this starter baseline.
