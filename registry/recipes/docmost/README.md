# Docmost

Practical self-hosted Docmost workspace for NVIDIA AI Hub using the official image, local PostgreSQL, Redis, and persistent document storage.

## What it provides

- Docmost web UI on port `3003`
- Local PostgreSQL database for users, spaces, and structured content metadata
- Local Redis service for caching and background task support
- Persistent storage for uploaded assets and knowledge-base content

## Default access

- Docmost UI: `http://localhost:3003`

## Configuration notes

- Update `registry/recipes/docmost/.env` before first launch.
- Replace `APP_SECRET` and the PostgreSQL password with strong values.
- Keep `APP_URL` aligned with the final public address if you change the port or add a reverse proxy.
- This baseline is intentionally minimal and does not include external object storage, email, or enterprise integrations.

## Persistent data

This recipe stores state under:

- `registry/recipes/docmost/data/postgres`
- `registry/recipes/docmost/data/redis`
- `registry/recipes/docmost/data/storage`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the recipe with the upstream Docmost container pattern using PostgreSQL, Redis, and persistent `/app/data/storage`
- checking that ports, service wiring, and bind mounts are internally consistent

Not validated here:

- live `docker compose up`, onboarding, login, or document editing, because Docker is not available in this Windows workspace
- email delivery, SSO, or enterprise-only features
- production reverse-proxy, backup, or HA behavior

## License notes

- Upstream project: `docmost/docmost`
- Review upstream licensing and feature-tier boundaries before production redistribution.

## Risk notes

- Placeholder secrets are insecure and must be replaced.
- Production deployments typically need SMTP, backup, and external storage planning beyond this starter baseline.
