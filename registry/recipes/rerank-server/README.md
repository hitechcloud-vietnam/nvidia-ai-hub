# Rerank Server

Dedicated Hugging Face Text Embeddings Inference baseline for NVIDIA GPUs focused on cross-encoder reranking workloads with `/rerank`, Swagger docs, health checks, Prometheus metrics, and optional Bearer-token authentication.

## What it provides

- Official `ghcr.io/huggingface/text-embeddings-inference` container baseline
- Native reranking endpoint at `/rerank`
- Swagger docs under `/docs`
- Health check endpoint at `/health`
- Model information endpoint at `/info`
- Prometheus metrics on a separate port
- Optional Bearer-token enforcement through `TEI_API_KEY`

## Default access

- Swagger docs: `http://localhost:3102/docs`
- Health check: `http://localhost:3102/health`
- Model info: `http://localhost:3102/info`
- Rerank API: `http://localhost:3102/rerank`
- Metrics: `http://localhost:9001/metrics`

## Included services

- `rerank-server`: official Hugging Face TEI container configured for reranker models

## Scope of this preset

This recipe intentionally provides a narrow single-purpose reranker baseline:

- uses the official TEI GPU container for one reranker model at a time
- exposes the documented `/rerank`, `/docs`, `/health`, `/info`, and Prometheus metrics surfaces
- persists downloaded model data in a local bind mount to avoid repeated downloads
- supports common runtime controls such as dtype, batching, request limits, payload size, telemetry, CORS, and optional API-key enforcement
- frames TEI as a dedicated local reranker rather than a broader embeddings runtime

This preset does **not** include:

- embedding endpoints as the primary advertised integration surface, even though TEI exposes broader capabilities depending on model type
- bundled chat UIs, vector databases, or retrieval orchestration layers
- production TLS termination, tenant isolation, or external rate limiting
- benchmark tuning for every supported reranker family or every GPU generation
- gRPC deployment mode or multi-model orchestration

## Required configuration

Before first launch, review `registry/recipes/rerank-server/.env` and change what applies to your environment:

- `TEI_MODEL_ID`
- `TEI_SERVED_MODEL_NAME`
- `TEI_DTYPE`
- `TEI_MAX_CONCURRENT_REQUESTS`
- `TEI_MAX_BATCH_TOKENS`
- `TEI_MAX_CLIENT_BATCH_SIZE`
- `TEI_API_KEY` if you do not want an unauthenticated local endpoint
- `HF_TOKEN` if the selected model repository is gated or private

Use a Hugging Face reranker model that is supported by TEI. Upstream examples include `BAAI/bge-reranker-large`, `BAAI/bge-reranker-base`, `Alibaba-NLP/gte-multilingual-reranker-base`, and `Alibaba-NLP/gte-reranker-modernbert-base`.

## Runtime notes

- TEI rerank support is intended for re-ranker sequence-classification models with a single class.
- `POST /rerank` expects a `query` string plus a `texts` array and returns ranked results.
- TEI returns a model-type error when the selected model is not a re-ranker model.
- Swagger and OpenAPI documentation are exposed under `/docs`.
- `GET /info` returns served model information.
- Prometheus metrics are served on a separate port, exposed here as `9001`.
- `TEI_API_KEY` enables Bearer-token enforcement at the TEI server layer.
- GPUs with CUDA compute capability below `7.5` are not supported upstream.

## Persistent data

This recipe stores state under:

- `registry/recipes/rerank-server/data`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, and documentation for the dedicated reranker runtime
- aligning the compose stack with official TEI Docker guidance for reranker models, documented `/rerank` usage, Swagger docs, health checks, model info route, and Prometheus metrics support
- wiring configurable runtime flags for reranker model ID, served model name, dtype, batching, payload size, telemetry, CORS, and optional API-key enforcement
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model downloads, or GPU-backed reranking, because Docker is not available in this Windows workspace
- actual score quality, ranking correctness, or latency characteristics for any chosen reranker model
- compatibility of every TEI-supported reranker family on the target GPU
- gRPC deployment mode or private-model preload workflows

## License notes

- Upstream project: `huggingface/text-embeddings-inference`
- Upstream license: Apache-2.0
- Review the selected model license separately because model licensing can differ from the runtime license

## Risk notes

- Leaving `TEI_API_KEY` empty exposes an unauthenticated reranking endpoint on the local network.
- Large cross-encoder rerankers may require more GPU memory or smaller batch limits than this baseline uses by default.
- A non-reranker model ID will cause request failures on `/rerank`.
- Operators must choose a TEI image tag compatible with their NVIDIA GPU generation.
