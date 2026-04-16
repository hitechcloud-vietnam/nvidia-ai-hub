# AgentOps Starter

Starter self-hosted AgentOps stack for DGX Spark using the official upstream API, dashboard, and OpenTelemetry collector with a bundled local ClickHouse service.

## What it provides

- AgentOps dashboard on port `3000`
- AgentOps FastAPI backend on port `8000`
- OpenTelemetry collector endpoints on ports `4317` and `4318`
- Local ClickHouse service on ports `8123` and `9000`
- Automatic ClickHouse database and schema bootstrap from the official upstream migration
- Persistent local ClickHouse data under `./data/clickhouse`

## Default access

- Dashboard: `http://localhost:3000`
- API health: `http://localhost:8000/health`
- API docs: `http://localhost:8000/redoc`
- OTLP gRPC: `localhost:4317`
- OTLP HTTP: `http://localhost:4318/v1/traces`
- ClickHouse HTTP: `http://localhost:8123`

## Scope of this starter

This recipe intentionally bundles only the parts that are practical inside this repository:

- official AgentOps API image build from the upstream repository
- official AgentOps dashboard image build from the upstream repository
- official AgentOps OpenTelemetry collector image build from the upstream repository
- local ClickHouse for trace and metrics storage

This recipe does **not** bundle a full Supabase stack. You must provide either:

- an external Supabase project, or
- a host-managed local Supabase instance and matching credentials

## Configuration notes

- Update `.env` before first launch. The placeholder Supabase keys in the template are not usable.
- If you use a local Supabase instance on the Docker host, keep `NEXT_PUBLIC_SUPABASE_URL` browser-reachable, but set `SUPABASE_HOST=host.docker.internal` so the API container can reach Postgres on the host.
- If you change `DASHBOARD_HOST_PORT` or `API_HOST_PORT`, also update `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `APP_DOMAIN`, and `API_DOMAIN` so browser URLs and API CORS settings stay aligned.
- `NEXT_PUBLIC_PLAYGROUND=false` is the safer default for local Supabase-style setups referenced by the upstream docs.
- The dashboard build embeds selected `NEXT_PUBLIC_*` values at image build time. Rebuild the recipe after changing those values.

## Persistent data

This recipe stores local analytics data under:

- `registry/recipes/agentops-starter/data/clickhouse`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the bundled services with the official AgentOps API, dashboard, OpenTelemetry collector, and ClickHouse guidance
- wiring the compose startup so ClickHouse initializes before the API and collector depend on it
- exposing the expected local ports `3000`, `8000`, `4317`, `4318`, `8123`, and `9000`

Not validated here:

- full upstream image build completion on this Windows workspace
- successful dashboard sign-in against a real Supabase project
- live trace ingestion from an external SDK into the local collector and dashboard
- billing, Stripe, Redis, or other optional upstream integrations

## License notes

- Upstream project: `AgentOps-AI/agentops`
- Upstream app license indicator in upstream docs: Elastic License 2.0 (`ELv2`)
- Review upstream licensing before production or commercial redistribution

## Risk notes

- Initial builds can be large and slow because the recipe builds multiple upstream services from source.
- AgentOps depends on correct Supabase credentials and a reachable Postgres endpoint; invalid auth or host settings will prevent sign-in and API operations.
- The ClickHouse schema is pulled from the upstream migration at container startup, so first-run success depends on outbound network access to GitHub.
- Exposing OTLP ingestion and dashboard ports increases local attack surface; keep this stack on trusted networks.
