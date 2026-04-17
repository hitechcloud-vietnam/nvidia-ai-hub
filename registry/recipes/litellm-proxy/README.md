# LiteLLM Proxy

Official LiteLLM proxy baseline for NVIDIA GPUs with one shared OpenAI-compatible endpoint, config-driven model routing, central API-key enforcement, and health APIs in front of multiple dedicated vLLM backends.

## What it provides

- Official `ghcr.io/berriai/litellm:main-stable` proxy container
- One shared OpenAI-compatible endpoint on port `4000`
- Config-driven `model_list` routing through `config.yaml`
- Central `master_key` enforcement for clients hitting the proxy
- Built-in LiteLLM health endpoints including `/health`, `/health/readiness`, `/health/liveness`, and `POST /health/test_connection`
- Two dedicated vLLM OpenAI-compatible backends published behind the proxy for a practical multi-model starter

## Why this recipe exists

The earlier `vllm-multi-model-gateway` recipe proves the minimum honest pattern for serving multiple base models behind one entrypoint. This LiteLLM recipe moves one step higher in the stack:

- keeps the upstream LiteLLM proxy itself as the routing layer instead of a custom gateway
- uses official `config.yaml` `model_list` definitions rather than hard-coded request dispatch logic
- preserves separate vLLM backend processes because one OpenAI-compatible vLLM server still serves one base model at a time
- introduces the richer LiteLLM health and policy surface that operators often need before external clients connect

## Default access

- Proxy models API: `http://localhost:4000/v1/models`
- Proxy chat completions: `http://localhost:4000/v1/chat/completions`
- Proxy liveness: `http://localhost:4000/health/liveness`
- Proxy readiness: `http://localhost:4000/health/readiness`
- Proxy model health: `http://localhost:4000/health`
- Proxy connection test: `http://localhost:4000/health/test_connection`
- Direct backend A models API: `http://localhost:9013/v1/models`
- Direct backend B models API: `http://localhost:9014/v1/models`

## Included services

- `litellm`: official LiteLLM proxy container
- `vllm-model-a`: dedicated vLLM backend for one configured model alias
- `vllm-model-b`: second dedicated vLLM backend for another configured model alias

## Scope of this preset

This recipe intentionally provides a practical LiteLLM starter rather than a full production control plane.

Included here:

- official LiteLLM proxy startup through `litellm --config /app/config.yaml`
- two routed model aliases exposed from one shared OpenAI-compatible port
- central client authentication through `general_settings.master_key`
- upstream OpenAI-compatible backend definitions using `api_base` values that include the required `/v1` suffix
- direct backend exposure on separate host ports for troubleshooting and comparison
- baseline LiteLLM health endpoints for liveness, readiness, model health, and targeted connection checks

Not included here:

- LiteLLM database-backed virtual key management, budgets, teams, or UI administration
- Redis, Postgres, or external observability integrations
- rate-limit policy design, spend tracking rollout, or enterprise secret-store integration
- automatic model benchmarking against NVIDIA GPUs memory limits
- TLS termination, ingress hardening, or external identity providers

## Required configuration

Before first launch, review `registry/recipes/litellm-proxy/.env` and change at least what applies to your environment:

- `LITELLM_MASTER_KEY`
- `LITELLM_SALT_KEY`
- `HF_TOKEN` if either upstream model is gated
- `VLLM_MODEL_A` and `VLLM_MODEL_B`
- `VLLM_MODEL_A_ALIAS` and `VLLM_MODEL_B_ALIAS`
- `VLLM_MODEL_A_API_KEY` and `VLLM_MODEL_B_API_KEY`
- `VLLM_MODEL_A_MAX_MODEL_LEN` and `VLLM_MODEL_B_MAX_MODEL_LEN`
- `VLLM_MODEL_A_GPU_MEMORY_UTILIZATION` and `VLLM_MODEL_B_GPU_MEMORY_UTILIZATION`

Also review `registry/recipes/litellm-proxy/config.yaml` if you want different routing names or additional upstream definitions.

## Launch

From the repository root:

1. Edit `registry/recipes/litellm-proxy/.env`.
2. Start the stack with the launch command in `recipe.yaml`.
3. Wait for both vLLM backends to finish loading.
4. Query `GET /v1/models` on port `4000` using `Authorization: Bearer <LITELLM_MASTER_KEY>`.
5. Send normal OpenAI-style requests to the proxy using one of the configured model aliases.

Example request:

`curl http://localhost:4000/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer change-me" -d '{"model":"qwen3-4b-instruct","messages":[{"role":"user","content":"Explain the route selection."}],"max_tokens":128}'`

## Runtime notes

- LiteLLM loads `model_list` entries from `config.yaml` and exposes them through `/v1/models`.
- For OpenAI-compatible upstreams such as vLLM, the configured `api_base` must include `/v1`.
- `GET /health/liveness` is the cheapest probe for container-alive checks.
- `GET /health/readiness` is the better probe for deciding whether the proxy is ready to accept traffic.
- `GET /health` is heavier because LiteLLM can make real model calls to evaluate backend health.
- `POST /health/test_connection` is useful when troubleshooting one configured model without sending normal client traffic through the proxy.
- This preset uses two separate vLLM backend processes because one vLLM OpenAI-compatible server cannot honestly host multiple unrelated base models on one port.
- Direct backend ports `9013` and `9014` are intentionally left published for debugging; keep them on trusted networks only.

## Persistent data

This recipe stores reusable state in:

- Docker volume `huggingface-cache`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, LiteLLM config, compose definition, and operator documentation for the proxy stack
- aligning the recipe with upstream LiteLLM patterns for `litellm --config`, `model_list`, `general_settings.master_key`, `/v1/models`, `/health`, `/health/readiness`, `/health/liveness`, and `POST /health/test_connection`
- preserving the required `/v1` suffix on OpenAI-compatible upstream `api_base` values
- checking the new recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, LiteLLM proxy startup, or GPU-backed inference, because Docker is not available in this Windows workspace
- actual `/health` or `/health/test_connection` responses against running backends
- model download success, gated repository access, or memory fit for the chosen vLLM models on the target host
- LiteLLM enterprise control-plane features that require external state services

## License notes

- Upstream project: `BerriAI/litellm`
- Upstream project license: MIT
- Upstream vLLM backend project license: Apache-2.0
- Review the selected model licenses separately because model licensing can differ from the proxy and runtime licenses

## Risk notes

- LiteLLM features evolve quickly, especially around health, key management, and admin surfaces, so future upstream releases may require config updates.
- Both backend models still consume real GPU memory independently even though clients see one proxy port.
- Leaving backend ports reachable can bypass the LiteLLM `master_key` control if network policy does not restrict them.
- `/health` can trigger real backend requests and should not be treated as a cheap liveness probe.
