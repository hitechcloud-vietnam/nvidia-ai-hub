# Budibase

Practical self-hosted Budibase workspace for NVIDIA AI Hub using official service images, local CouchDB, Redis, MinIO-compatible object storage, and the default proxy-exposed web UI.

## What it provides

- Budibase UI on port `3015`
- Local CouchDB for platform state
- Local Redis for queueing and coordination
- Local MinIO-compatible object storage for uploaded assets
- Separate app, worker, and proxy services

## Default access

- Budibase UI: `http://localhost:3015`
- MinIO API: `http://localhost:9002`
- MinIO console: `http://localhost:9003`

## Configuration notes

- Update `registry/recipes/budibase/.env` before first launch.
- Budibase requires several secrets; replace all placeholders before any non-local use.
- This recipe intentionally models a smaller local baseline of the official multi-service architecture rather than a full production cluster.
- The upstream project evolves quickly, so image and environment compatibility should be re-checked before production rollout.

## Persistent data

This recipe stores state under:

- `registry/recipes/budibase/data/couchdb`
- `registry/recipes/budibase/data/redis`
- `registry/recipes/budibase/data/minio`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the stack with documented Budibase Docker Compose concepts around CouchDB, MinIO, proxy, app, and worker services
- checking that ports, secrets, and inter-service references are internally consistent

Not validated here:

- live `docker compose up`, first workspace creation, internal app publishing, or background automation execution, because Docker is not available in this Windows workspace
- compatibility with every newer upstream compose revision, AI feature dependency, or enterprise-gated capability
- reverse-proxy hardening, TLS, backup, or production scaling behavior

## License notes

- Upstream project: `Budibase/budibase`
- Review self-hosted licensing and plan-gated feature boundaries before production redistribution.

## Risk notes

- This is the highest-risk recipe in the current batch because the stack is multi-service and secret-heavy.
- Incorrect secret or storage wiring can prevent startup or break uploads and background work.
