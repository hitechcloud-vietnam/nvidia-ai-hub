# TensorRT-LLM API Gateway

Official TensorRT-LLM OpenAI-compatible serving baseline for NVIDIA GPUs with `/v1` inference APIs, `/health`, `/metrics`, `/version`, configurable parallelism, and persistent local cache mounts.

## What it provides

- Official NVIDIA TensorRT-LLM container baseline
- OpenAI-compatible endpoints under `/v1`
- Operational endpoints including `/health`, `/metrics`, and `/version`
- Configurable Tensor, pipeline, and expert parallelism flags
- Optional YAML-based runtime tuning for PyTorch-backend metrics
- Persistent local cache, model, and log directories

## Default access

- Models API: `http://localhost:3098/v1/models`
- Chat completions: `http://localhost:3098/v1/chat/completions`
- Completions: `http://localhost:3098/v1/completions`
- Health check: `http://localhost:3098/health`
- Metrics: `http://localhost:3098/metrics`
- Version: `http://localhost:3098/version`

## Included services

- `tensorrt-llm-gateway`: official TensorRT-LLM container running `trtllm-serve`

## Scope of this preset

This recipe intentionally provides a conservative single-node gateway baseline:

- uses `trtllm-serve` to expose the documented OpenAI-compatible HTTP surface
- defaults to the PyTorch backend to avoid requiring a prebuilt TensorRT engine in this baseline
- supports Hugging Face model IDs, optional tokenizer overrides, and common serving controls such as TP, PP, EP, batch size, sequence length, and KV-cache sizing
- enables iteration performance stats through a mounted YAML config when requested so `/metrics` has useful PyTorch-backend data
- keeps engine build pipelines, model conversion workflows, multi-node Slurm deployment, and disaggregated serving topologies out of scope

This preset does **not** include:

- automatic checkpoint conversion or `trtllm-build` engine generation
- production authentication, TLS termination, API gateway policy, or multi-tenant isolation
- bundled chat UIs or application frameworks
- validated multimodal configuration beyond the documented baseline server surface

## Required configuration

Before first launch, review `registry/recipes/tensorrt-llm-gateway/.env` and change what applies to your environment:

- `TRTLLM_MODEL`
- `TRTLLM_BACKEND`
- `TRTLLM_TP_SIZE`, `TRTLLM_PP_SIZE`, and `TRTLLM_EP_SIZE`
- `TRTLLM_MAX_BATCH_SIZE`
- `TRTLLM_MAX_NUM_TOKENS`
- `TRTLLM_MAX_SEQ_LEN`
- `TRTLLM_KV_CACHE_FREE_GPU_MEMORY_FRACTION`
- `TRTLLM_TRUST_REMOTE_CODE`
- `HF_TOKEN` if the selected model repository is gated or private

If you switch from the default PyTorch backend to a TensorRT engine path, you may also need to set `TRTLLM_TOKENIZER` explicitly.

## Runtime notes

- `trtllm-serve` exposes `/v1/models`, `/v1/completions`, and `/v1/chat/completions` as OpenAI-compatible endpoints.
- The same server exposes `/health`, `/metrics`, and `/version` for operational checks.
- TensorRT-LLM documentation notes that `/metrics` is richer on the TensorRT backend; for the PyTorch backend, iteration stats require `enable_iter_perf_stats`, which this recipe can enable through `extra-llm-api-config.yml`.
- Multimodal serving may require extra YAML options such as disabling block reuse and may support only chat-style APIs depending on the selected model family.
- This image is hosted on `nvcr.io`; reviewers should confirm registry access and image pull rights in their environment before deployment.
- Telemetry is disabled in this baseline with `TRTLLM_NO_USAGE_STATS=1` to keep the local recipe conservative.

## Persistent data

This recipe stores state under:

- `registry/recipes/tensorrt-llm-gateway/cache`
- `registry/recipes/tensorrt-llm-gateway/models`
- `registry/recipes/tensorrt-llm-gateway/logs`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, runtime YAML, and documentation for the gateway
- aligning the compose stack with documented `trtllm-serve` endpoints and commonly used serve flags
- wiring optional metrics config for the PyTorch backend and exposing health plus metrics endpoints consistently
- checking the recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model pulls, or GPU-backed inference, because Docker is not available in this Windows workspace
- NGC registry authentication and image pull behavior for `nvcr.io/nvidia/tensorrt-llm/release:spark-single-gpu-dev`
- model-specific checkpoint conversion, engine-build workflows, or backend-specific performance tuning
- multimodal, disaggregated, or multi-node serving behavior

## License notes

- Upstream project: `NVIDIA/TensorRT-LLM`
- Upstream project license should be reviewed directly in the TensorRT-LLM repository before redistribution or commercial packaging
- Container access and redistribution terms for NVIDIA NGC images should be reviewed separately from the source repository license

## Risk notes

- The selected NGC image tag can change behavior over time and may require follow-up compatibility adjustments.
- Large or advanced models can require significantly more GPU memory, shared memory, or custom serve flags than this baseline exposes by default.
- Some model families need `--trust_remote_code`, reasoning parsers, multimodal YAML options, or a TensorRT-engine workflow instead of the default PyTorch path.
- This baseline exposes an unauthenticated local endpoint; use only on trusted networks unless you add a gateway or proxy layer.