# Metabase

Practical self-hosted Metabase analytics workspace for NVIDIA AI Hub using the official image and a local PostgreSQL application database.

## What it provides

- Metabase web UI on port `3002`
- Local PostgreSQL application database for dashboards, collections, settings, and saved questions
- Simple analytics surface for AI operations, usage reporting, and internal observability workflows

## Default access

- Metabase UI: `http://localhost:3002`

## Configuration notes

- Update `registry/recipes/metabase/.env` before first launch.
- Replace the PostgreSQL password with a strong value.
- Metabase supports a local embedded application database, but this recipe intentionally uses PostgreSQL because upstream recommends a production-ready database for durable deployments.
- If you place Metabase behind a reverse proxy or change the public URL, review upstream application settings after first login.

## Persistent data

This recipe stores state under:

- `registry/recipes/metabase/data/postgres`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the deployment with official Metabase Docker guidance for the OSS image, port `3000`, health endpoint, and PostgreSQL-backed application database
- checking that ports, environment-variable wiring, and persistent database storage are internally consistent

Not validated here:

- live `docker compose up`, first-user onboarding, or dashboard creation, because Docker is not available in this Windows workspace
- plugin installation, SSO, or Pro/Enterprise features
- production reverse-proxy, TLS, backup, or HA behavior

## License notes

- Upstream project: `metabase/metabase`
- This recipe targets the open-source Metabase image. Pro and Enterprise editions use different licensing terms.

## Risk notes

- Metabase should not rely on the embedded H2 database for production use.
- Placeholder secrets are insecure and must be replaced.
- Long-term production deployments need a stronger backup and upgrade plan for the application database.
