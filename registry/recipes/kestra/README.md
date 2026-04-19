# Kestra

Practical self-hosted Kestra workspace for NVIDIA AI Hub using the official image, a local PostgreSQL backend, and persistent local storage for flows and execution artifacts.

## What it provides

- Kestra orchestration UI on port `3012`
- Local PostgreSQL backend for workflow state, schedules, and queues
- Persistent storage for local artifacts and temporary work directories

## Default access

- Kestra UI: `http://localhost:3012`
- Default basic auth credentials come from `registry/recipes/kestra/.env`

## Configuration notes

- Update `registry/recipes/kestra/.env` before first launch.
- This baseline follows the documented standalone Kestra Docker pattern with PostgreSQL and a mounted configuration file.
- PostgreSQL is pinned to version `16` to reduce upgrade-drift risk noted in upstream docs.
- The container runs as `root` in this local baseline because upstream local Compose guidance uses a root-oriented setup for task execution and mounted working directories.

## Persistent data

This recipe stores state under:

- `registry/recipes/kestra/data/postgres`
- `registry/recipes/kestra/data/storage`
- `registry/recipes/kestra/data/tmp`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, configuration file, and documentation
- aligning the stack with the documented Kestra Docker Compose pattern using PostgreSQL-backed state
- checking that ports, configuration references, and persistent bind mounts are internally consistent

Not validated here:

- live `docker compose up`, flow execution, Docker-socket task execution, or worker behavior, because Docker is not available in this Windows workspace
- production hardening, non-root production deployment patterns, or multi-component/high-availability topologies

## License notes

- Upstream project: `kestra-io/kestra`
- Enterprise images and features use separate distribution paths and are intentionally out of scope for this community baseline.

## Risk notes

- This baseline mounts the Docker socket and uses a root-oriented local setup, which increases operational risk.
- Review task permissions, secrets, and workflow source trust before running untrusted flows.
