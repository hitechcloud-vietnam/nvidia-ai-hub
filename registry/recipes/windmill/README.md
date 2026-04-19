# Windmill

Practical self-hosted Windmill workspace for NVIDIA AI Hub using the official image, local PostgreSQL, and a simple server-plus-worker baseline.

## What it provides

- Windmill UI and API on port `3014`
- Local PostgreSQL backend for state and job queues
- One dedicated worker for local automation execution

## Default access

- Windmill UI: `http://localhost:3014`
- Initial admin values come from `registry/recipes/windmill/.env`

## Configuration notes

- Update `registry/recipes/windmill/.env` before first launch.
- This recipe intentionally uses a simpler server-plus-worker baseline instead of the full official local stack with Caddy, LSP, and multiplayer.
- `BASE_URL` should match the externally published URL.
- The worker mounts the Docker socket and disables some Linux-specific isolation defaults to stay closer to a generic local baseline.

## Persistent data

This recipe stores state under:

- `registry/recipes/windmill/data/postgres`
- `registry/recipes/windmill/data/worker`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the stack with documented Windmill self-hosting concepts around PostgreSQL-backed state, server, and worker roles
- checking that ports, environment wiring, and persistent bind mounts are internally consistent

Not validated here:

- live `docker compose up`, first-login flow, script execution, or worker job processing, because Docker is not available in this Windows workspace
- the full official Caddy/LSP/multiplayer topology
- production hardening, reverse-proxy setup, or enterprise-only capabilities

## License notes

- Upstream project: `windmill-labs/windmill`
- Some collaboration and enterprise self-hosting capabilities are outside this baseline and should be reviewed separately.

## Risk notes

- Windmill is operationally more complex than a single-container app because the server and worker roles must stay aligned.
- The worker can execute powerful jobs; review trust boundaries, secrets, and Docker-socket exposure before production use.
