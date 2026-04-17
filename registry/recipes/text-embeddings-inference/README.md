# Text Embeddings Inference

Official Hugging Face Text Embeddings Inference baseline for NVIDIA GPUs with fast embedding APIs, reranking support, sequence-classification endpoints, Swagger docs, Prometheus metrics, and optional OpenAI-style authentication.

## What it provides

- Official `ghcr.io/huggingface/text-embeddings-inference` container baseline
- Native embedding endpoint at `/embed`
- Native reranking endpoint at `/rerank`
- Native prediction endpoint at `/predict` for supported sequence-classification models
- Sparse embedding endpoint at `/embed_sparse` when compatible SPLADE pooling is enabled
- Swagger docs under `/docs`
- Health check and Prometheus metrics endpoints for operational checks

## Default access

- Swagger docs: `http://localhost:3101/docs`
- Health check: `http://localhost:3101/health`
- Metrics: `http://localhost:9000/metrics`
- Embed API: `http://localhost:3101/embed`
- Rerank API: `http://localhost:3101/rerank`
- Predict API: `http://localhost:3101/predict`
- Sparse embeddings API: `http://localhost:3101/embed_sparse`

## Included services

- `text-embeddings-inference`: official Hugging Face Text Embeddings Inference container

## Scope of this preset

This recipe intentionally provides a conservative single-runtime baseline:

- uses the official TEI GPU container for one embedding, reranking, or sequence-classification model at a time
- exposes the documented `/embed`, `/rerank`, `/predict`, `/embed_sparse`, `/docs`, and metrics surfaces
- persists downloaded model data in a local bind mount to avoid repeated downloads
- supports common runtime controls such as dtype, pooling, batching, prompt defaults, request limits, telemetry, and optional Bearer-token authentication
- keeps gRPC variants, multi-model orchestration, Kubernetes deployment, and custom gateway policies out of scope

This preset does **not** include:

- bundled chat products or application UIs
- production TLS termination, tenant isolation, or external rate limiting
- benchmark tuning for every supported embedding or reranker model family
- a second companion runtime for cross-model routing or fallback

## Required configuration

Before first launch, review `registry/recipes/text-embeddings-inference/.env` and change what applies to your environment:

- `TEI_MODEL_ID`
- `TEI_SERVED_MODEL_NAME`
- `TEI_DTYPE`
- `TEI_POOLING` when you need to override model defaults
- `TEI_MAX_BATCH_TOKENS`
- `TEI_MAX_CONCURRENT_REQUESTS`
- `TEI_MAX_CLIENT_BATCH_SIZE`
- `TEI_API_KEY` if you do not want an unauthenticated local endpoint
- `HF_TOKEN` if the selected model repository is gated or private

Use a Hugging Face model ID that is tagged for Text Embeddings Inference and sized appropriately for the target GPU memory budget.

## Runtime notes

- TEI defaults to port `3000` inside the container; this recipe publishes it externally on port `3101`.
- TEI publishes Swagger and OpenAPI documentation under `/docs`.
- The runtime supports embedding, reranking, and sequence-classification models, but the endpoint set depends on the selected model family.
- `TEI_API_KEY` enables Bearer-token enforcement at the TEI server layer.
- Prometheus metrics are served on a separate port, exposed here as `9000`.
- Upstream documentation also provides gRPC image variants, but this baseline keeps the standard HTTP container only.
- GPUs with CUDA compute capability below `7.5` are not supported upstream.

## Persistent data

This recipe stores state under:

- `registry/recipes/text-embeddings-inference/data`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, and documentation for the runtime
- aligning the compose stack with official TEI Docker usage, supported GPU image guidance, and documented `/docs`, `/embed`, `/rerank`, `/predict`, `/embed_sparse`, `/health`, and Prometheus metrics surfaces
- wiring configurable runtime flags for model ID, served model name, dtype, pooling, batching, prompt defaults, payload size, telemetry, CORS, and optional API-key enforcement
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model downloads, or GPU-backed embedding inference, because Docker is not available in this Windows workspace
- actual reranking, sparse embedding, or sequence-classification behavior for any chosen model
- throughput, latency, memory fit, or batching stability for any selected model on the target host
- gRPC deployment mode or air-gapped preload workflows

## License notes

- Upstream project: `huggingface/text-embeddings-inference`
- Upstream license: Apache-2.0
- Review the selected model license separately because model licensing can differ from the runtime license

## Risk notes

- Some TEI image tags are compute-capability specific; operators must select an image compatible with their NVIDIA GPU generation.
- Large embedding or reranker models may require more GPU memory or tighter batching controls than this baseline exposes by default.
- Leaving `TEI_API_KEY` empty exposes an unauthenticated inference endpoint on the local network.
- Certain model families may require prompt defaults, pooling overrides, or gated-model access before they behave as expected.
