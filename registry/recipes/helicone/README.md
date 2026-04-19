# Helicone

Practical self-hosted Helicone stack for NVIDIA AI Hub using the official all-in-one image for LLM logging, proxying, analytics, and request inspection.

## What it provides

- Helicone dashboard on port `3004`
- Proxy/API endpoint on port `8585`
- Embedded all-in-one deployment path that bundles the main stateful dependencies behind one official image
- Local persistent storage for internal PostgreSQL, ClickHouse, and S3-compatible object data

## Default access

- Helicone dashboard: `http://localhost:3004`
- Helicone proxy/API endpoint: `http://localhost:8585`

## Configuration notes

- Update `registry/recipes/helicone/.env` before first launch.
- Keep `NEXT_PUBLIC_APP_URL` aligned with your exposed dashboard URL.
- This recipe uses the upstream all-in-one image because it is the most practical self-hosting baseline for the current repository.
- Treat port `8585` as sensitive infrastructure and avoid exposing it broadly without access controls.

## Persistent data

This recipe stores state under:

- `registry/recipes/helicone/data/postgres`
- `registry/recipes/helicone/data/clickhouse`
- `registry/recipes/helicone/data/minio`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the deployment with the official Helicone all-in-one self-hosting path and its documented dashboard, proxy, and object-storage ports
- checking that port mappings and persistent bind mounts are internally consistent

Not validated here:

- live `docker compose up`, dashboard onboarding, or request logging, because Docker is not available in this Windows workspace
- compatibility with older Helicone compose patterns or future image-layout changes
- production hardening, TLS, secret rotation, or HA behavior

## License notes

- Upstream project: `Helicone/helicone`
- Review upstream license terms and any hosted/commercial feature boundaries before production redistribution.

## Risk notes

- The all-in-one image simplifies setup but hides substantial internal state and service complexity.
- Exposed proxy infrastructure can capture sensitive prompts, metadata, and keys if deployed carelessly.
- Long-term production use should include stronger network controls, backup strategy, and version pinning.
