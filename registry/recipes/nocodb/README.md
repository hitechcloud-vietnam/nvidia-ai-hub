# NocoDB

Practical self-hosted NocoDB workspace for NVIDIA AI Hub using the official image and a local PostgreSQL metadata database.

## What it provides

- NocoDB web UI on port `3011`
- Local PostgreSQL metadata database for workspace state
- Persistent bind mounts for PostgreSQL and NocoDB data

## Default access

- NocoDB UI: `http://localhost:3011`

## Configuration notes

- Update `registry/recipes/nocodb/.env` before first launch.
- This recipe prefers a PostgreSQL-backed baseline rather than the simplest single-container quickstart so that metadata storage is more durable.
- If you change the host port, keep `NC_PUBLIC_URL` aligned with the published URL.

## Persistent data

This recipe stores state under:

- `registry/recipes/nocodb/data/postgres`
- `registry/recipes/nocodb/data/nocodb`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the stack with the documented NocoDB Docker deployment pattern and a PostgreSQL-backed metadata baseline
- checking that ports, environment wiring, and persistent bind mounts are internally consistent

Not validated here:

- live `docker compose up`, initial onboarding, external datasource connections, or automation flows, because Docker is not available in this Windows workspace
- compatibility with every supported upstream database adapter or enterprise deployment pattern

## License notes

- Upstream project: `nocodb/nocodb`
- Review upstream licensing and edition boundaries before production redistribution.

## Risk notes

- NocoDB itself is straightforward, but downstream datasource permissions still need careful review.
- This recipe is a conservative local baseline, not a full high-availability deployment.
