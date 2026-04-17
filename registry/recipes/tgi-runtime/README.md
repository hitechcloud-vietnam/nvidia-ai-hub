# TGI Runtime

Official Hugging Face Text Generation Inference baseline for NVIDIA GPUs with generation endpoints, OpenAI-compatible chat completions, Swagger docs, Prometheus metrics, and persistent model cache storage.

## What it provides

- Official `ghcr.io/huggingface/text-generation-inference` container baseline
- Native generation endpoints such as `/generate` and `/generate_stream`
- OpenAI-compatible chat completions under `/v1/chat/completions`
- Swagger docs under `/docs`
- Health and metrics endpoints for operational checks
- Configurable sharding, quantization, token limits, tracing, and CORS settings

## Default access

- Swagger docs: `http://localhost:3099/docs`
- Health check: `http://localhost:3099/health`
- Metrics: `http://localhost:3099/metrics`
- Native generate API: `http://localhost:3099/generate`
- Native stream API: `http://localhost:3099/generate_stream`
- OpenAI-compatible chat API: `http://localhost:3099/v1/chat/completions`

## Included services

- `tgi-runtime`: official Hugging Face Text Generation Inference container

## Scope of this preset

This recipe intentionally provides a conservative single-runtime baseline:

- uses the official TGI GPU container and launcher for a single-node runtime
- exposes the documented `/generate`, `/generate_stream`, `/health`, `/metrics`, `/docs`, and `/v1/chat/completions` surfaces
- persists downloaded model data in a local bind mount to avoid repeated downloads
- supports common runtime controls such as shard count, quantization, token limits, tracing, and CORS configuration
- keeps advanced routing, multi-model orchestration, Kubernetes deployment, and custom gateway policies out of scope

This preset does **not** include:

- bundled chat products or application UIs
- production authentication, TLS termination, tenant isolation, or external rate limiting
- benchmark tuning for every supported model family
- AMD, Gaudi, Intel, or CPU-specific compose variants

## Required configuration

Before first launch, review `registry/recipes/tgi-runtime/.env` and change what applies to your environment:

- `TGI_MODEL_ID`
- `TGI_NUM_SHARD`
- `TGI_QUANTIZE`
- `TGI_MAX_INPUT_LENGTH`
- `TGI_MAX_TOTAL_TOKENS`
- `TGI_MAX_BATCH_PREFILL_TOKENS`
- `TGI_CUDA_MEMORY_FRACTION`
- `TGI_TRUST_REMOTE_CODE`
- `TGI_CORS_ALLOW_ORIGIN`
- `HF_TOKEN` if the selected model repository is gated or private

Use a Hugging Face model ID that is supported by TGI and sized appropriately for the target GPU memory budget.

## Runtime notes

- TGI documents `/docs` as the OpenAPI and Swagger surface for the REST server.
- TGI supports both native generation APIs and an OpenAI-compatible Messages API surface.
- The official documentation recommends `--shm-size 1g` for Docker workloads because NCCL may need shared memory during multi-GPU inference.
- Distributed tracing can be enabled with `--otlp-endpoint`; this recipe exposes that as an optional environment variable.
- If you run without GPUs, upstream documentation recommends `--disable-custom-kernels`, but CPU-only mode is not the intended deployment target for this project.
- Upstream documentation states that TGI is in maintenance mode and recommends evaluating newer engines such as vLLM or SGLang for future-heavy investment.

## Persistent data

This recipe stores state under:

- `registry/recipes/tgi-runtime/data`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, and documentation for the runtime
- aligning the compose stack with documented TGI Docker launch patterns, `/docs`, `/generate`, `/generate_stream`, `/health`, and `/v1/chat/completions` API surfaces
- wiring configurable runtime flags for model ID, shards, quantization, token limits, tracing, CORS, and gated-model access
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model downloads, or GPU-backed inference, because Docker is not available in this Windows workspace
- behavior of gated model downloads with `HF_TOKEN`
- throughput, latency, memory fit, or quantization stability for any specific model on the target host
- long-term maintenance risk from TGI's upstream maintenance-mode status

## License notes

- Upstream project: `huggingface/text-generation-inference`
- Upstream license: Apache-2.0
- Review the selected model license separately because model licensing can differ from the runtime license

## Risk notes

- TGI is in upstream maintenance mode, so long-term feature velocity is lower than actively expanding alternatives.
- Large models may require more GPU memory, shared memory, or shard tuning than this baseline exposes by default.
- Leaving the endpoint without an external security layer exposes an unauthenticated local inference service.
- Some models require `--trust-remote-code`, quantization flags, or more aggressive token-limit tuning before they behave correctly.