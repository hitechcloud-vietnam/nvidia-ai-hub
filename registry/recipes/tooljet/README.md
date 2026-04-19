# ToolJet

Practical self-hosted ToolJet workspace for NVIDIA AI Hub using the official image and local PostgreSQL databases for a single-instance internal tools baseline.

## What it provides

- ToolJet web UI on port `3013`
- Local PostgreSQL backing databases for application state and ToolJet DB features
- Simple single-instance baseline without separate workflow workers

## Default access

- ToolJet UI: `http://localhost:3013`

## Configuration notes

- Update `registry/recipes/tooljet/.env` before first launch.
- ToolJet expects `TOOLJET_HOST` to match the published URL, including the protocol.
- This recipe intentionally stays single-instance and does not add the separate worker or external Redis topology described for more advanced workflow scheduling.
- The PostgreSQL container initializes both `PG_DB` and `TOOLJET_DB` through `registry/recipes/tooljet/initdb/01-create-tooljet-dbs.sql`.

## Persistent data

This recipe stores state under:

- `registry/recipes/tooljet/data/postgres`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, init SQL, and documentation
- aligning the stack with the documented ToolJet Docker deployment flow and required PostgreSQL-backed baseline
- checking that ports, database wiring, and environment references are internally consistent

Not validated here:

- live `docker compose up`, admin onboarding, datasource setup, or workflow scheduling, because Docker is not available in this Windows workspace
- multi-worker or Redis-backed workflow execution patterns
- compatibility with every LTS or enterprise image/tag combination

## License notes

- Upstream project: `ToolJet/ToolJet`
- Review upstream OSS versus enterprise/LTS image selection before production redistribution.

## Risk notes

- ToolJet requires multiple secrets and two PostgreSQL databases, so incorrect initialization can break startup.
- This recipe is intentionally conservative and does not claim support for scaled workflow workers.
