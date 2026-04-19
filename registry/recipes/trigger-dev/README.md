# Trigger.dev

Conservative self-hosted Trigger.dev baseline for NVIDIA AI Hub using the official webapp image, local PostgreSQL, Redis, and Electric services, and a published web interface on port `8030`.

## What it provides

- Trigger.dev web UI on port `8030`
- Local PostgreSQL database
- Local Redis service
- Local Electric service for the webapp baseline

## Default access

- Trigger.dev UI: `http://localhost:8030`

## Configuration notes

- Update `registry/recipes/trigger-dev/.env` before first launch.
- Replace every placeholder secret before any nontrivial use.
- This recipe intentionally focuses on a conservative webapp baseline and does not include the broader worker or supervisor topology often discussed in production self-hosting guidance.
- `APP_ORIGIN` and `LOGIN_ORIGIN` should match the published URL.

## Persistent data

This recipe stores state under:

- `registry/recipes/trigger-dev/data/postgres`
- `registry/recipes/trigger-dev/data/redis`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the stack with documented Trigger.dev webapp environment variables, published web port `8030`, and required PostgreSQL, Redis, and Electric dependencies
- checking that internal URLs, health-check wiring, and service dependencies are internally consistent for a conservative baseline

Not validated here:

- live `docker compose up`, login flows, task execution, or supervisor-managed workers, because Docker is not available in this Windows workspace
- ClickHouse, MinIO, supervisor, registry, or broader production-scale self-hosting topologies
- compatibility with every Trigger.dev image tag or release train

## License notes

- Upstream project: `triggerdotdev/trigger.dev`
- Review upstream license and self-hosting guidance before production redistribution.

## Risk notes

- Trigger.dev has a more complex production architecture than this baseline, so this recipe should be treated as experimental.
- Even if the webapp starts, background execution behavior may still require additional upstream services that are intentionally out of scope here.