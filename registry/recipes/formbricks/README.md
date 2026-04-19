# Formbricks

Practical self-hosted Formbricks workspace for NVIDIA AI Hub using the official image, local PostgreSQL and Redis services, and persistent uploads for a conservative single-instance baseline.

## What it provides

- Formbricks web UI on port `3000`
- Local PostgreSQL database for application state
- Local Redis service required by current self-hosted deployments
- Persistent uploads directory

## Default access

- Formbricks UI: `http://localhost:3000`

## Configuration notes

- Update `registry/recipes/formbricks/.env` before first launch.
- `WEBAPP_URL` and `NEXTAUTH_URL` should usually match the published URL.
- Replace all generated placeholder secrets before any nontrivial deployment.
- SMTP and object-storage integrations are intentionally left out of this baseline and should be added only if needed.

## Persistent data

This recipe stores state under:

- `registry/recipes/formbricks/data/postgres`
- `registry/recipes/formbricks/data/redis`
- `registry/recipes/formbricks/data/uploads`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the stack with documented Formbricks self-hosting requirements for PostgreSQL, Redis, and core application secrets
- checking that URLs, database wiring, Redis wiring, and mounts are internally consistent

Not validated here:

- live `docker compose up`, onboarding flows, SMTP delivery, or survey collection, because Docker is not available in this Windows workspace
- S3-compatible object storage, enterprise-only features, or every image-tag combination
- upgrade behavior across major Formbricks releases

## License notes

- Upstream project: `formbricks/formbricks`
- Review upstream license and feature-tier terms before production redistribution.

## Risk notes

- Formbricks relies on multiple secrets plus PostgreSQL and Redis, so incorrect values can block startup or authentication.
- This recipe is intentionally conservative and does not claim validation for SMTP, S3, or production hardening paths.