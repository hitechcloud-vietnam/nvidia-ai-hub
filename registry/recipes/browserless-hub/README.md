# Browserless Hub

Practical self-hosted Browserless Chromium endpoint for NVIDIA AI Hub using the official container image.

## What it provides

- Browserless Chromium endpoint on port `3000`
- HTTP and WebSocket automation access for Playwright, Puppeteer, and related browser-agent workflows
- Built-in documentation endpoint at `/docs`
- Persistent browser user-data directory for local session state

## Default access

- Browserless docs: `http://localhost:3000/docs`
- Browser WebSocket endpoint: `ws://localhost:3000`

## Configuration notes

- Update `registry/recipes/browserless-hub/.env` before first launch.
- Replace `TOKEN` before exposing the endpoint to any shared network.
- Tune `CONCURRENT`, `QUEUE_LENGTH`, and `TIMEOUT` to match host capacity and workload patterns.
- This recipe uses the Chromium image variant. Switch to a different upstream image if your use case requires it.

## Persistent data

This recipe stores state under:

- `registry/recipes/browserless-hub/data/browserless`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the recipe with Browserless quickstart guidance for the Chromium image, `/docs` endpoint, and port `3000`

Not validated here:

- live browser session execution, Playwright/Puppeteer connectivity, or PDF/screenshot jobs, because Docker is not available in this Windows workspace
- compatibility with enterprise-only Browserless features

## License notes

- Upstream project: `browserless/browserless`
- Browserless publishes multiple editions and licensing terms. Review the upstream repository and commercial terms carefully before redistribution or production use.

## Risk notes

- Exposed Browserless instances can be abused for high-resource browser automation if not protected.
- Version, edition, and license expectations should be reviewed carefully before enterprise rollout.
- Placeholder token values are insecure and must be replaced.
