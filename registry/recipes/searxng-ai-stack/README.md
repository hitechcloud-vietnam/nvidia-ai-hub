# SearXNG AI Stack

Practical self-hosted SearXNG stack for NVIDIA AI Hub using the official container image, local Redis caching, and persistent configuration storage.

## What it provides

- SearXNG web UI on port `8080`
- Redis-backed caching baseline for search performance
- Persistent configuration and cache directories for local customization
- Good fit for privacy-oriented browsing, retrieval, and AI-assisted search workflows

## Default access

- SearXNG UI: `http://localhost:8080`

## Configuration notes

- Update `registry/recipes/searxng-ai-stack/.env` before first launch.
- This recipe seeds only high-level environment variables. You will likely want to review generated settings under `data/searxng` after first startup.
- Keep `SEARXNG_BASE_URL` aligned with your exposed URL if you change the port or place the service behind a reverse proxy.
- Upstream deployments often add a reverse proxy such as Caddy. This minimal baseline keeps the stack smaller for local evaluation.

## Persistent data

This recipe stores state under:

- `registry/recipes/searxng-ai-stack/data/searxng`
- `registry/recipes/searxng-ai-stack/data/cache`
- `registry/recipes/searxng-ai-stack/data/redis`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the recipe with SearXNG Docker deployment guidance covering the official image, Redis-backed caching, and persistent `/etc/searxng` plus `/var/cache/searxng` mounts

Not validated here:

- live startup, search-engine reachability, or anti-bot behavior, because Docker is not available in this Windows workspace
- production reverse-proxy, TLS, or hardened internet-facing deployment patterns

## License notes

- Upstream project: `searxng/searxng`
- Review the upstream project license and search-provider terms before production redistribution

## Risk notes

- Search engine upstreams may throttle or block automated traffic.
- Real-world SearXNG behavior often requires settings tuning beyond this starter baseline.
- Internet-facing deployments typically need extra proxy, rate-limit, and trust-boundary controls.
