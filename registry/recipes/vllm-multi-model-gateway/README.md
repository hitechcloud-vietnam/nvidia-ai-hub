# vLLM Multi-Model Gateway

## What it provides

This preset publishes a single OpenAI-compatible gateway on port `9010` and places two dedicated `vllm serve` backends behind it.

The default layout exposes these model IDs through one shared API entrypoint:

- `qwen3-4b-instruct` → backend A
- `llama32-3b-instruct` → backend B

## Why this recipe exists

Upstream vLLM documents that one OpenAI-compatible vLLM server hosts **one base model at a time**. A single server can expose aliases for that model, and it can also list LoRA adapters, but it does not natively host multiple unrelated base models on one port.

This recipe keeps that upstream behavior honest by running:

1. one vLLM server per base model
2. one lightweight FastAPI gateway that inspects the requested `model`
3. one shared external endpoint for client applications

## Default access

- Gateway base URL: `http://<SPARK_IP>:9010/v1`
- Model catalog: `http://<SPARK_IP>:9010/v1/models`
- Gateway health: `http://<SPARK_IP>:9010/healthz`
- Backend A direct URL: `http://<SPARK_IP>:9011/v1`
- Backend B direct URL: `http://<SPARK_IP>:9012/v1`

All gateway requests require `Authorization: Bearer <GATEWAY_API_KEY>` when `GATEWAY_API_KEY` is set.

## Included services

- `gateway` — lightweight FastAPI router for OpenAI-style requests
- `vllm-model-a` — dedicated vLLM server for `VLLM_MODEL_A`
- `vllm-model-b` — dedicated vLLM server for `VLLM_MODEL_B`

## Scope of this preset

### Included

- one shared OpenAI-compatible URL for multiple backend models
- aggregated `/v1/models` listing across both backends
- request routing by the `model` field in the JSON payload
- direct backend ports for debugging and observability

### Out of scope

- automatic load balancing across replicas of the same model
- policy routing, retries, spend controls, caching, or provider failover
- dynamic service discovery beyond the two declared routes
- TLS termination or external identity integration

If you need broader policy control, a provider abstraction layer, or cost-aware routing, the next roadmap item should be handled by the dedicated `LiteLLM proxy` recipe instead.

## Required configuration

Edit `registry/recipes/vllm-multi-model-gateway/.env` before launch.

Important variables:

- `GATEWAY_PORT` — shared external gateway port
- `GATEWAY_API_KEY` — bearer token enforced by the gateway and passed to both vLLM backends
- `HF_TOKEN` — required for gated Hugging Face models
- `VLLM_MODEL_A`, `VLLM_MODEL_B` — Hugging Face model IDs served by each backend
- `VLLM_MODEL_A_ALIAS`, `VLLM_MODEL_B_ALIAS` — stable external model IDs presented to clients
- `VLLM_MODEL_A_HOST_PORT`, `VLLM_MODEL_B_HOST_PORT` — direct backend access ports
- `VLLM_MODEL_A_MAX_MODEL_LEN`, `VLLM_MODEL_B_MAX_MODEL_LEN` — per-model context limits
- `VLLM_MODEL_A_GPU_MEMORY_UTILIZATION`, `VLLM_MODEL_B_GPU_MEMORY_UTILIZATION` — backend memory tuning

## Launch

Use the catalog command in `recipe.yaml` to build the gateway image and start the full stack.

The gateway container is built locally from:

- `Dockerfile`
- `gateway-requirements.txt`
- `gateway_app.py`

The two vLLM backends use the upstream `vllm/vllm-openai` image.

## Runtime notes

- vLLM defaults to an OpenAI-compatible server on port `8000`; this recipe remaps that internal port to host ports `9011` and `9012`.
- The gateway publishes its own entrypoint on port `9010`.
- `/metrics` and `/version` remain most reliable on the direct backend ports because this recipe keeps gateway logic minimal.
- The `model` field must be present in routed inference requests such as `/v1/chat/completions`, `/v1/completions`, or `/v1/embeddings`.
- `--served-model-name` is used to publish one stable alias per backend model. That alias is not evidence of multi-base-model support inside a single vLLM server.

## Persistent data

- `huggingface-cache` Docker volume stores shared model downloads
- `models/` is reserved for optional local artifacts
- `logs/` is mounted into the gateway container for operator troubleshooting
- `gateway/` is reserved for future local gateway state or generated files

## Validation scope

Validation in this workspace was limited to static review only.

Completed checks:

- reviewed upstream vLLM source and docs for OpenAI server behavior, `/v1/models`, `/metrics`, `/version`, API key support, and multi-model limitations
- compared the design against existing local recipes such as `tensorrt-llm-gateway` and single-model `vllm-*` entries
- checked editor diagnostics for the new recipe files

Not completed:

- `docker compose up` was not run because Docker runtime access was unavailable in this workspace
- live gateway routing, backend startup, GPU allocation, and Hugging Face model download behavior were not exercised

Residual reviewer risk:

- runtime behavior still needs smoke testing on a Docker host with NVIDIA GPU access
- selected default model IDs may require adjustment depending on local GPU memory, upstream image compatibility, and token-gated access

## License notes

- vLLM is distributed under Apache-2.0
- model weights, tokenizer assets, and gated downloads follow their respective upstream licenses and access controls
- this recipe adds a small local FastAPI gateway and does not change upstream model licenses

## Risk notes

- exposing direct backend ports means operators should keep the host on a trusted network or add external firewall controls
- the same API key is configured on the gateway and backend services for operational simplicity; security-sensitive environments may want a stricter edge proxy design
- large model combinations can oversubscribe GPU memory if both backends are configured aggressively
