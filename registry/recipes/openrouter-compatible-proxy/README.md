# OpenRouter-Compatible Proxy

Local OpenRouter relay baseline that publishes one small OpenAI-compatible proxy shim on the NVIDIA AI Hub host while forwarding requests to OpenRouter's hosted upstream API.

## What it provides

- Local relay endpoint on port `3015`
- OpenAI-compatible local API base at `http://localhost:3015/v1`
- Hosted OpenRouter upstream API base at `https://openrouter.ai/api/v1`
- Local relay health probe at `/healthz`
- Provider-routed chat completions through one upstream API key
- Optional attribution headers such as `HTTP-Referer`, `X-Title`, and category metadata
- Access to organization-prefixed model IDs such as `openrouter/auto`, `anthropic/claude-sonnet-4`, or other OpenRouter catalog entries

## Default access

- Local relay health: `http://localhost:3015/healthz`
- Local relay models API: `http://localhost:3015/v1/models`
- Local relay chat completions API: `http://localhost:3015/v1/chat/completions`
- Local relay model endpoint details API: `http://localhost:3015/v1/models/<model>/endpoints`
- Hosted upstream base URL: `https://openrouter.ai/api/v1`

## Included services

- `openrouter-relay`: lightweight NGINX-based local relay shim that forwards `/v1/*` requests to OpenRouter upstream

## Scope of this preset

This recipe intentionally provides a conservative relay baseline:

- keeps actual model execution, provider routing, retries, and availability under OpenRouter control
- exposes one local `/v1/*` endpoint so downstream clients can talk to a local port instead of the public hostname directly
- forwards authorization and attribution headers through a simple NGINX shim without claiming to self-host OpenRouter itself
- keeps credential brokers, rate-limit policy engines, caching layers, and private egress hardening out of scope

This preset does **not** include:

- a self-hosted OpenRouter runtime or any local model execution engine
- automatic OpenRouter account creation, billing setup, or API-key provisioning
- guarantees for every upstream provider model, provider availability zone, or routing outcome
- enterprise SSO, private networking, or organization policy controls beyond what OpenRouter exposes upstream

## Required configuration

Before first use, review `registry/recipes/openrouter-compatible-proxy/.env` and adjust at least:

- `OPENROUTER_API_KEY`
- `OPENROUTER_DEFAULT_MODEL`
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_APP_TITLE`
- `OPENROUTER_RELAY_PORT`
- `OPENROUTER_UPSTREAM_SCHEME`
- `OPENROUTER_UPSTREAM_HOST`

You also need an active OpenRouter account and API key.

## Launch

From the repository root:

1. Edit `registry/recipes/openrouter-compatible-proxy/.env`.
2. Start the relay with the launch command in `recipe.yaml`.
3. Wait for `GET /healthz` on the relay port to return `200`.
4. Point OpenAI-compatible clients to `http://localhost:3015/v1`.
5. Send normal OpenAI-style requests with `Authorization: Bearer <OPENROUTER_API_KEY>`.

## Runtime notes

- The relay translates local `/v1/*` requests into upstream `/api/v1/*` requests against `openrouter.ai`.
- Authentication still uses `Authorization: Bearer <OPENROUTER_API_KEY>` and the relay does not store or mint credentials.
- OpenRouter documents `/api/v1/models` as the hosted catalog endpoint for model discovery; the local relay exposes this as `/v1/models`.
- Model IDs should be sent using OpenRouter's organization-prefixed naming, such as `openrouter/auto` or provider-qualified IDs.
- Optional attribution headers such as `HTTP-Referer`, `X-Title`, and `X-OpenRouter-Title` are forwarded by the relay.
- This relay is a convenience shim only. It does not add local caching, retries, model registry persistence, or auth policy beyond header pass-through.

## Persistent data

This relay does not maintain local model weights or local runtime state for inference.

Only lightweight operator configuration and local container logs are stored in:

- `registry/recipes/openrouter-compatible-proxy/.env`
- `registry/recipes/openrouter-compatible-proxy/.env.example`
- `registry/recipes/openrouter-compatible-proxy/relay/default.conf.template`
- `registry/recipes/openrouter-compatible-proxy/logs`

## Validation scope

Validated in this repository by:

- creating registry metadata, environment templates, relay config, compose definition, and operator documentation for the local OpenRouter shim
- aligning the local `/v1/*` relay behavior with OpenRouter's published `https://openrouter.ai/api/v1` API surface and hosted models endpoint
- forwarding authorization and attribution headers through the relay configuration while preserving upstream OpenRouter ownership of execution and routing
- checking the recipe files for editor diagnostics

Not validated here:

- live OpenRouter authentication with a real tenant API key
- actual chat completion requests, billing behavior, or provider routing outcomes
- attribution header processing or upstream routing behavior in practice
- enterprise governance features outside the public API surface
- live `docker compose up` or relay behavior at runtime, because Docker is not available in this Windows workspace

## License notes

- Review OpenRouter terms, provider terms, and each selected upstream model license separately before production use
- This relay recipe provides local NGINX configuration only and does not redistribute OpenRouter software or third-party model weights

## Risk notes

- OpenRouter remains a managed upstream dependency, so service availability, latency, and routing behavior can change outside this repository.
- The relay forwards sensitive authorization headers, so it should remain on trusted local networks unless additional ingress controls are added.
- Provider-specific limits, moderation behavior, and model capabilities vary by selected model and upstream provider.
- Using remote inference may introduce data-governance, residency, or billing concerns if operators do not review OpenRouter and provider policies carefully.
