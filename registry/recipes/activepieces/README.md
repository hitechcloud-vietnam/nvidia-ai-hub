# Activepieces

Practical self-hosted Activepieces automation workspace for NVIDIA AI Hub using the official image, local PostgreSQL, Redis, and persistent application state.

## What it provides

- Activepieces web UI on port `3005`
- Local PostgreSQL database for workflow and account state
- Local Redis service for queueing and background job support
- Persistent local application directory for runtime state and configuration

## Default access

- Activepieces UI: `http://localhost:3005`

## Configuration notes

- Update `registry/recipes/activepieces/.env` before first launch.
- Replace the PostgreSQL password, `AP_ENCRYPTION_KEY`, and `AP_JWT_SECRET` with strong values.
- Upstream offers simpler personal-use paths, but this recipe intentionally uses PostgreSQL and Redis to better match durable automation workloads.
- Review any email, queue, or external storage settings you need before broader deployment.

## Persistent data

This recipe stores state under:

- `registry/recipes/activepieces/data/postgres`
- `registry/recipes/activepieces/data/redis`
- `registry/recipes/activepieces/data/app`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the deployment with the upstream Activepieces self-hosting shape using the official image with PostgreSQL, Redis, and persistent application data
- checking that port mappings, service wiring, and bind mounts are internally consistent

Not validated here:

- live `docker compose up`, workflow execution, or connector authentication, because Docker is not available in this Windows workspace
- enterprise-only features, horizontal scaling, or production email setup
- compatibility with every upstream environment variable across future releases

## License notes

- Upstream project: `activepieces/activepieces`
- Review upstream licensing and edition boundaries before production redistribution.

## Risk notes

- Placeholder secrets are insecure and must be replaced.
- Real production deployments often need email, backup, secret management, and upgrade planning beyond this starter baseline.
