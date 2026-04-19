# Directus

Practical self-hosted Directus workspace for NVIDIA AI Hub using the official image, persistent local SQLite storage, and uploads for a conservative single-instance baseline.

## What it provides

- Directus web UI and API on port `8055`
- Local SQLite-backed metadata storage
- Persistent uploads, extensions, and database directories

## Default access

- Directus UI: `http://localhost:8055`

## Configuration notes

- Update `registry/recipes/directus/.env` before first launch.
- Set strong values for `KEY` and `SECRET` before any nontrivial use.
- `PUBLIC_URL` should match the published URL, especially when running behind a reverse proxy.
- This recipe intentionally uses SQLite for a lighter baseline instead of external PostgreSQL or MySQL.

## Persistent data

This recipe stores state under:

- `registry/recipes/directus/data/database`
- `registry/recipes/directus/data/uploads`
- `registry/recipes/directus/data/extensions`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the stack with the official Directus container defaults, published port `8055`, and SQLite deployment path
- checking that environment references, persistent mounts, and health-check wiring are internally consistent

Not validated here:

- live `docker compose up`, first-run admin onboarding, or reverse-proxy behavior, because Docker is not available in this Windows workspace
- scaled deployments, external databases, Redis-backed caching, or object-storage integrations
- compatibility with every Directus image tag or extension combination

## License notes

- Upstream project: `directus/directus`
- Review the upstream license and extension compatibility before production redistribution.

## Risk notes

- SQLite is practical for a small single-instance baseline but is not the right fit for every concurrent or production-heavy deployment.
- Weak `KEY` or `SECRET` values can break sessions or create an insecure deployment.