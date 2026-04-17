# Dify

Practical self-hosted Dify stack for NVIDIA GPUs using the official upstream images for the web UI, API, workers, sandbox, plugin daemon, PostgreSQL, Redis, and Weaviate.

## What it provides

- Dify web UI on port `3081`
- Dify API on port `5001`
- Background workers for workflow execution and scheduled tasks
- Local PostgreSQL, Redis, and Weaviate services for metadata, queues, and vector storage
- Bundled sandbox and plugin daemon services for code execution and plugin support
- Persistent local data under `./data/*`

## Default access

- Web UI: `http://localhost:3081`
- Initial onboarding: `http://localhost:3081/install`
- API health: `http://localhost:5001/health`
- API docs: `http://localhost:5001/console/api/docs`

## Included services

- `web`: official Dify frontend
- `api`: official Dify backend
- `worker`: Celery worker for datasets, workflows, and async jobs
- `worker_beat`: Celery beat for scheduled tasks
- `db_postgres`: local PostgreSQL metadata store
- `redis`: local cache and queue broker
- `weaviate`: local default vector database
- `sandbox`: code execution sidecar
- `plugin_daemon`: plugin runtime service

## Required configuration

Before first launch, review `./.env` and change at least these values:

- `SECRET_KEY`
- `DB_PASSWORD`
- `REDIS_PASSWORD`
- `SANDBOX_API_KEY`
- `PLUGIN_DAEMON_KEY`
- `PLUGIN_DIFY_INNER_API_KEY`
- `WEAVIATE_API_KEY`

If you change `WEB_HOST_PORT` or `API_HOST_PORT`, also update these matching URLs in `./.env`:

- `CONSOLE_API_URL`
- `CONSOLE_WEB_URL`
- `SERVICE_API_URL`
- `TRIGGER_URL`
- `APP_API_URL`
- `APP_WEB_URL`
- `FILES_URL`

If you change `REDIS_PASSWORD`, also update `CELERY_BROKER_URL` so the worker services still authenticate correctly.

## Scope of this starter

This recipe intentionally keeps a practical subset of the official Docker deployment for this repository:

- official upstream images are used directly
- PostgreSQL is used as the metadata database
- Weaviate is used as the default local vector store
- the web UI is exposed directly on port `3081` instead of routing through the upstream nginx profile
- sandbox outbound networking is disabled by default, so the upstream SSRF proxy and reverse proxy layers are not bundled here

## Persistent data

This recipe stores data under:

- `registry/recipes/dify/data/postgres`
- `registry/recipes/dify/data/redis`
- `registry/recipes/dify/data/storage`
- `registry/recipes/dify/data/plugin_daemon`
- `registry/recipes/dify/data/weaviate`
- `registry/recipes/dify/data/sandbox`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the bundled services and image tags with the official Dify Docker distribution
- wiring service dependencies for PostgreSQL, Redis, Weaviate, sandbox, plugin daemon, API, worker, and web startup
- exposing the expected local ports `3081` and `5001`

Not validated here:

- full runtime startup of every Dify service on this Windows workspace
- first-run onboarding through `http://localhost:3081/install`
- live model provider setup, dataset indexing, plugin installation, or outbound sandbox networking
- optional upstream nginx, certbot, SSRF proxy, alternate databases, or alternate vector store profiles

## License notes

- Upstream project: `langgenius/dify`
- Upstream license: modified Apache License 2.0 with additional commercial and frontend branding conditions
- Review upstream license terms before commercial redistribution or multi-tenant hosting

## Risk notes

- Dify is a large multi-service stack; cold image pulls can be large and slow.
- This recipe intentionally trims the official deployment surface, so features tied to nginx, certbot, SSRF proxying, or alternate storage backends remain reviewer follow-up work.
- Exposing both the web UI and API locally increases attack surface; keep this stack on trusted networks.