# Infinity Embeddings Runtime

Official Infinity v2 baseline for NVIDIA GPUs with OpenAI-compatible embeddings APIs, model discovery, optional reranking and classification support, Swagger docs, FastAPI health checks, and persistent Hugging Face cache.

## What it provides

- Official `michaelf34/infinity` container baseline using `infinity_emb v2`
- OpenAI-compatible embeddings endpoint at `/v1/embeddings`
- Model discovery endpoint at `/v1/models`
- FastAPI Swagger docs under `/v1/docs`
- Health check endpoint at `/health`
- Optional reranking endpoint at `/v1/rerank` for compatible reranker models
- Optional classification endpoint at `/v1/classify` for compatible classifier models
- Optional multi-model launch by supplying a second `--model-id`
- Optional Bearer-token enforcement through `INFINITY_API_KEY`

## Default access

- Swagger docs: `http://localhost:7997/v1/docs`
- Health check: `http://localhost:7997/health`
- Models API: `http://localhost:7997/v1/models`
- Embeddings API: `http://localhost:7997/v1/embeddings`
- Rerank API: `http://localhost:7997/v1/rerank`
- Classify API: `http://localhost:7997/v1/classify`

## Included services

- `infinity-embeddings-runtime`: official Infinity container

## Scope of this preset

This recipe intentionally provides a conservative single-compose baseline:

- uses the official Infinity container and `infinity_emb v2` launcher
- exposes the documented `/health`, `/v1/docs`, `/v1/models`, `/v1/embeddings`, `/v1/rerank`, and `/v1/classify` surfaces
- persists downloaded Hugging Face cache data in a local bind mount to avoid repeated downloads
- supports common runtime controls such as model ID, engine, dtype, batch sizing, warmup, device selection, telemetry opt-out, JSON logs, and optional API-key enforcement
- allows a second model ID for simple multi-model serving when the operator needs more than one deployed embedding or rerank model

This preset does **not** include:

- bundled chat UIs or vector databases
- production TLS termination, tenant isolation, or external rate limiting
- benchmark tuning for every supported Infinity backend, ONNX path, TensorRT path, ROCm path, or CPU-only path
- explicit Prometheus scrape endpoint documentation because the upstream materials gathered for this session did not confirm a stable dedicated metrics surface
- workload-specific tuning for CLIP, audio, ColBERT, or ColPali deployments

## Required configuration

Before first launch, review `registry/recipes/infinity-embeddings-runtime/.env` and change what applies to your environment:

- `INFINITY_MODEL_ID`
- `INFINITY_MODEL_ID_2` if you want a second served model
- `INFINITY_API_KEY` if you do not want an unauthenticated local endpoint
- `INFINITY_ENGINE`
- `INFINITY_DTYPE`
- `INFINITY_EMBEDDING_DTYPE`
- `INFINITY_BATCH_SIZE`
- `INFINITY_DEVICE`
- `INFINITY_MAX_CLIENT_BATCH_SIZE`
- `INFINITY_MAX_INPUT_LENGTH`
- `HF_TOKEN` if the selected model repository is gated or private

Use Hugging Face model IDs that match the intended task. Embedding models and reranker models can both be served, but endpoint behavior depends on the capabilities of the selected model.

## Runtime notes

- Infinity exposes FastAPI docs at the configured URL prefix plus `/docs`; this recipe uses `/v1/docs`.
- The root OpenAI-compatible prefix in this recipe is `/v1`, matching common client expectations and upstream LangChain examples.
- `GET /v1/models` returns served model information and runtime stats.
- `POST /v1/embeddings` is the primary OpenAI-compatible embeddings API.
- `POST /v1/rerank` follows Infinity's rerank route for compatible reranker models.
- `POST /v1/classify` is available only for compatible classification models.
- `GET /health` returns a simple timestamp-based readiness response.
- Infinity supports API-key protection through the `--api-key` launch option; this recipe wires that to `INFINITY_API_KEY`.
- Infinity supports additional backends and model families beyond text embeddings, but this preset keeps the catalog framing focused on embeddings and related retrieval workloads.

## Persistent data

This recipe stores state under:

- `registry/recipes/infinity-embeddings-runtime/data`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, and documentation for the Infinity embeddings baseline
- aligning the compose stack with official Infinity Docker guidance, `infinity_emb v2` launch usage, `/health`, `/v1/docs`, `/v1/models`, `/v1/embeddings`, `/v1/rerank`, and `/v1/classify` routes documented in upstream sources
- wiring configurable runtime flags for model IDs, URL prefix, engine, dtype, embedding dtype, batching, warmup, device selection, logging, telemetry, and optional API-key enforcement
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model downloads, or GPU-backed inference, because Docker is not available in this Windows workspace
- actual multi-model behavior, reranking, or classification execution for any selected model
- throughput, latency, memory fit, or backend selection behavior for any chosen model on the target host
- ONNX, TensorRT, ROCm, CPU-only, or Trainium deployment variants

## License notes

- Upstream project: `michaelfeil/infinity`
- Upstream license: MIT
- Review the selected model license separately because model licensing can differ from the runtime license

## Risk notes

- Leaving `INFINITY_API_KEY` empty exposes an unauthenticated inference endpoint on the local network.
- Larger embedding or reranking models may require more GPU memory, different engine settings, or smaller batch sizes than this baseline uses by default.
- Some advanced Infinity features depend on backend-specific dependencies or hardware paths that were not validated in this workspace.
- A model that does not support reranking or classification will return capability errors on those optional endpoints.
