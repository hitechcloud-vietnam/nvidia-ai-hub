# OmniRoute

Official OmniRoute AI gateway baseline for operators who need one local control plane for multi-provider LLM access, OpenAI-compatible `/v1` traffic, smart fallback chains, rate-limit visibility, cache controls, and dashboard-driven observability.

## What it provides

- Official `diegosouzapw/omniroute` container baseline
- OpenAI-compatible API endpoint exposed through `/v1`
- Dashboard for provider onboarding, policies, combos, API keys, analytics, limits, health, logs, and audit surfaces
- Smart routing features including fallback chains, retries, provider selection, and cost-aware combos
- Cache and resilience endpoints for semantic cache, circuit-breaker state, and rate-limit visibility
- Persistent local data for database state, logs, cache, and saved provider configuration

## Default access

- Dashboard: `http://localhost:20128/dashboard`
- Dashboard health: `http://localhost:20128/api/monitoring/health`
- OpenAI-compatible models API: `http://localhost:20129/v1/models`
- OpenAI-compatible chat completions: `http://localhost:20129/v1/chat/completions`
- Dashboard models inventory: `http://localhost:20128/api/models`
- Cache stats: `http://localhost:20128/api/cache/stats`
- Resilience state: `http://localhost:20128/api/resilience`
- Telemetry summary: `http://localhost:20128/api/telemetry/summary`
- Fallback chains: `http://localhost:20128/api/fallback/chains`
- Budget controls: `http://localhost:20128/api/usage/budget`

## Included services

- `omniroute`: official all-in-one OmniRoute runtime with dashboard and OpenAI-compatible API surfaces

## Scope of this preset

This recipe intentionally focuses on the official OmniRoute single-container deployment shape:

- runs the upstream OmniRoute container from Docker Hub
- publishes split ports so the dashboard remains on `20128` and the OpenAI-compatible `/v1` API is exposed on `20129`
- stores local state in `registry/recipes/omniroute/data`
- enables operators to configure upstream providers, combos, fallback rules, rate controls, API keys, and dashboard policies after startup
- keeps the integration contract honest: OmniRoute is a gateway and control plane, not a self-contained model runtime

This preset does **not** include:

- bundled provider credentials or pre-connected upstream model accounts
- automatic production TLS termination, reverse proxy hardening, or SSO
- separate Redis, Postgres, or external observability backends
- tested HA scaling, Kubernetes manifests, or enterprise secret-store integration
- validated provider-specific pricing, quota correctness, or cache-hit rates in this workspace

## Required configuration

Before first launch, review `registry/recipes/omniroute/.env` and change at least:

- `OMNIROUTE_JWT_SECRET`
- `OMNIROUTE_API_KEY_SECRET`
- `OMNIROUTE_INITIAL_PASSWORD`
- `OMNIROUTE_STORAGE_ENCRYPTION_KEY` for a stronger production baseline
- `OMNIROUTE_BASE_URL` if the service will not be reached at `http://localhost:20128`
- `OMNIROUTE_CORS_ORIGIN` when exposing the API to external browser clients
- `OMNIROUTE_REQUIRE_API_KEY` and downstream API-key policy according to your security posture

After startup, sign in to the dashboard and complete provider onboarding before expecting useful `/v1` model responses.

## Runtime notes

- OmniRoute exposes two model discovery surfaces: `GET /api/models` for dashboard inventory and `GET /v1/models` for the active OpenAI-compatible endpoint.
- Split-port mode follows upstream guidance: `DASHBOARD_PORT` serves the dashboard while `API_PORT` serves `/v1/*` traffic separately.
- Dashboard health probes target `/api/monitoring/health` on the dashboard port.
- Cache management is exposed through `GET /api/cache/stats` and `DELETE /api/cache/stats`.
- Resilience and operational policy surfaces include `/api/resilience`, `/api/resilience/reset`, `/api/rate-limits`, `/api/telemetry/summary`, `/api/usage/budget`, and `/api/fallback/chains`.
- Upstream providers and model aliases are configured after deployment; a representative alias is `cc/claude-sonnet-4-20250514`, but the actual model list depends on the providers you connect.
- OmniRoute supports single-port mode upstream, but this recipe uses split ports because it is clearer for gateway operators and easier to document in the catalog.

## Persistent data

This recipe stores state under:

- `registry/recipes/omniroute/data`

## Validation scope

Validated in this repository by:

- researching the official OmniRoute upstream project and Docker distribution
- creating catalog metadata, environment templates, compose definition, and operator documentation for the gateway
- aligning the recipe with upstream port behavior, `/v1` compatibility, dashboard pathing, health probing, cache stats, resilience APIs, telemetry APIs, and fallback-chain management surfaces
- checking the new recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, dashboard login, provider onboarding, or API traffic, because Docker is not available in this Windows workspace
- actual fallback behavior, load balancing, retries, cache-hit rates, or cost controls against any upstream provider
- production hardening for TLS, secret management, SSO, or external persistence backends
- compatibility with every supported provider, CLI integration, or dashboard workflow documented by OmniRoute upstream

## License notes

- Upstream project: `diegosouzapw/OmniRoute`
- Upstream package and container: `omniroute`, `diegosouzapw/omniroute`
- Review the upstream repository for the current license and any bundled third-party dependencies before production rollout
- Review each connected provider's terms and model licenses separately because OmniRoute only brokers access to external services

## Risk notes

- OmniRoute is operationally broader than a simple proxy, so upgrades can affect dashboard state, auth flows, cache behavior, and policy endpoints.
- Without configured upstream providers, the `/v1` surface may start successfully but still have no useful models to serve.
- Weak bootstrap secrets or an unchanged initial password materially reduce the security posture of the deployment.
- Split ports simplify operations, but they also require firewall and reverse-proxy rules to cover both dashboard and API listeners.
