# Hoppscotch

Conservative self-hosted Hoppscotch workspace for NVIDIA AI Hub using the official all-in-one image, a local PostgreSQL database, and persistent server data for API collaboration.

## What it provides

- Main Hoppscotch web UI on port `3000`
- Admin surface on port `3100`
- Backend API on port `3170`
- Webapp server surface on port `3200`
- Local PostgreSQL database for state and workspace data

## Default access

- Hoppscotch UI: `http://localhost:3000`
- Admin UI: `http://localhost:3100`

## Configuration notes

- Update `registry/recipes/hoppscotch/.env` before first launch.
- This recipe uses the upstream all-in-one image to keep the compose file smaller, but the platform itself still exposes multiple internal surfaces.
- Replace `JWT_SECRET`, `SESSION_SECRET`, and `TOKEN_SALT_COMPLEXITY` before real use.
- `WHITELISTED_ORIGINS` and the `VITE_*` URLs should match the published URLs if you run behind a proxy or custom domain.

## Persistent data

This recipe stores state under:

- `registry/recipes/hoppscotch/data/postgres`
- `registry/recipes/hoppscotch/data/webapp-server`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the baseline with Hoppscotch self-hosted environment variables, PostgreSQL dependency, and multi-port all-in-one topology
- checking that published ports, URL variables, and persisted server data mounts are internally consistent

Not validated here:

- live `docker compose up`, login flows, email delivery, or team collaboration flows, because Docker is not available in this Windows workspace
- mailer configuration, external object storage, or every reverse-proxy permutation
- every upstream AIO image tag or split-service topology

## License notes

- Upstream project: `hoppscotch/hoppscotch`
- Review upstream license and deployment guidance before production redistribution.

## Risk notes

- Hoppscotch is more complex than a single-port app, so mismatched URL or origin variables can break authentication or UI behavior.
- This recipe is intentionally marked `experimental` because it uses a conservative AIO baseline rather than validating every upstream self-hosted topology.