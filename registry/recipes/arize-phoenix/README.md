# Arize Phoenix

Practical self-hosted Arize Phoenix workspace for NVIDIA AI Hub using the official container image and a persistent local data mount.

## What it provides

- Phoenix web UI on port `6006`
- Local persisted workspace data for traces, spans, evaluations, and datasets
- Simple single-container baseline for experimentation and review workflows

## Default access

- Phoenix UI: `http://localhost:6006`

## Configuration notes

- Update `registry/recipes/arize-phoenix/.env` before first launch.
- Pin the image tag to a specific `version-X.Y.Z` release for reproducible deployments.
- The nonroot image variant may require pre-adjusted filesystem permissions; this baseline uses the default image for simpler local startup.
- Enable auth and replace `PHOENIX_SECRET` before exposing this service beyond a trusted local network.

## Persistent data

This recipe stores state under:

- `registry/recipes/arize-phoenix/data`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the recipe with Arize Phoenix self-hosting guidance for the official Docker image and persistent local storage

Not validated here:

- live container startup, login flows, or ingestion from instrumented applications, because Docker is not available in this Windows workspace
- exact auth behavior for every upstream release tag

## License notes

- Upstream project: `Arize-ai/phoenix`
- Review the upstream project license before production redistribution

## Risk notes

- Leaving auth disabled exposes the local workspace to anyone who can reach the port.
- Future upstream image changes may add or rename environment variables.
