# n8n AI Starter

Practical self-hosted n8n starter for NVIDIA AI Hub using the official n8n image, local PostgreSQL, and persistent user data.

## What it provides

- n8n editor and runtime UI on port `5678`
- Local PostgreSQL database for workflows, credentials, and execution metadata
- Persistent `.n8n` user directory for encryption keys, logs, and related state
- Baseline suitable for AI workflows, agents, automations, webhooks, and scheduled jobs

## Default access

- n8n UI: `http://localhost:5678`

## Configuration notes

- Update `registry/recipes/n8n-ai-starter/.env` before first launch.
- Replace `N8N_ENCRYPTION_KEY` and the PostgreSQL password with strong values.
- Keep `WEBHOOK_URL`, `N8N_EDITOR_BASE_URL`, host, protocol, and exposed port aligned if you change the default port or place the service behind a reverse proxy.
- n8n still benefits from the persistent `.n8n` directory even when PostgreSQL is used, because it stores additional runtime state beyond the database.

## Persistent data

This recipe stores state under:

- `registry/recipes/n8n-ai-starter/data/postgres`
- `registry/recipes/n8n-ai-starter/data/n8n`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the recipe with n8n Docker self-hosting guidance for the official image, port `5678`, timezone configuration, and persistent `.n8n` storage
- wiring PostgreSQL as the default durable database backend for this starter

Not validated here:

- live `docker compose up`, first-user onboarding, or workflow execution, because Docker is not available in this Windows workspace
- queue-mode, SSO, tunnel, or enterprise features

## License notes

- Upstream project: `n8n-io/n8n`
- Review the upstream project license and edition terms before production redistribution

## Risk notes

- n8n is powerful and can execute sensitive workflow logic, so exposed instances must be hardened carefully.
- Incorrect `WEBHOOK_URL` or reverse-proxy settings can break inbound triggers and OAuth callbacks.
- Placeholder secrets are insecure and must be replaced before broader use.
