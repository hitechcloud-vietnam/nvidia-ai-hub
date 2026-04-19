# VLM-R1 7B

Official OpenBMB `VLM-R1-7B` baseline for operators who want a compact multimodal reasoning model behind a local OpenAI-compatible vLLM endpoint.

## What it provides

- OpenAI-compatible `/v1` API via the official `vllm/vllm-openai` container
- `openbmb/VLM-R1-7B` served as a single-model multimodal runtime
- Image-grounded chat workflows through the Chat Completions API
- Strong fit for compact visual reasoning, OCR-heavy documents, chart reading, and screenshot analysis
- Persistent Hugging Face cache stored in the named Docker volume

## Default access

- Models API: `http://localhost:9001/v1/models`
- Chat Completions API: `http://localhost:9001/v1/chat/completions`

## Included services

- `vllm`: OpenAI-compatible vLLM API server hosting `openbmb/VLM-R1-7B`

## Scope of this preset

This recipe focuses on a direct single-node vLLM deployment shape:

- runs one OpenAI-compatible vLLM server
- serves one multimodal model at a time
- enables one image per prompt by default
- preserves the Hugging Face cache between restarts
- keeps configuration simple enough for local NVIDIA GPU, NVIDIA DGX and NVIDIA DGX Spark-style experimentation

This preset does **not** include:

- multi-node serving, autoscaling, or gateway routing
- production TLS termination or API-key enforcement in front of vLLM
- validated batching or concurrency tuning for every GPU size
- custom chat-template overrides, because this recipe assumes the upstream tokenizer ships a usable template

## Required configuration

Review `registry/recipes/vllm-vlm-r1-7b/.env` before launch and adjust as needed:

- `VLLM_PORT` to change the exposed API port
- `VLLM_MAX_MODEL_LEN` to reduce or expand the runtime context window
- `VLLM_MAX_NUM_SEQS` to tune concurrency
- `VLLM_LIMIT_IMAGES` to change image count per request
- `VLLM_GPU_MEMORY_UTILIZATION` to fit your available GPU memory budget
- `HF_HUB_OFFLINE` and `TRANSFORMERS_OFFLINE` if you are operating from a pre-populated local cache

## Runtime notes

- The runtime uses `--trust-remote-code` because OpenBMB multimodal checkpoints commonly require custom model code paths.
- The server exposes the standard OpenAI-compatible `/v1/models` and `/v1/chat/completions` endpoints.
- For multimodal requests, send `messages[].content` as a mixed list of text and `image_url` items.
- vLLM vision serving depends on the model-provided chat template; if upstream changes its tokenizer assets, you may need to supply a manual template override later.
- This recipe defaults to one image per prompt to keep memory usage predictable on smaller single-GPU systems.

## Example request

```text
curl http://localhost:9001/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"openbmb/VLM-R1-7B","messages":[{"role":"user","content":[{"type":"text","text":"Summarize the trend in this chart."},{"type":"image_url","image_url":{"url":"https://example.com/chart.png"}}]}]}'
```

## Validation scope

Validated in this repository by:

- auditing the roadmap and confirming `VLM-R1 7B` was the earliest missing recipe in strict order
- aligning this recipe with the existing vLLM multimodal catalog pattern used elsewhere in the registry
- using upstream vLLM documentation for OpenAI-compatible chat serving and multimodal image inputs
- checking the new recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model download, or inference, because Docker is not available in this Windows workspace
- actual VLM-R1 tokenizer behavior, chat-template compatibility, or generation quality on real images
- exact GPU memory fit across all NVIDIA SKUs beyond the conservative defaults documented here

## License notes

- Upstream model: `openbmb/VLM-R1-7B`
- Serving runtime: `vllm/vllm-openai`
- Review the Hugging Face model card and upstream repository metadata for the current model license and usage terms before production rollout

## Risk notes

- If upstream changes the model card, tokenizer assets, or remote code implementation, the runtime flags here may require adjustment.
- Multimodal reasoning models can consume significantly more memory than text-only models at the same parameter size.
- This recipe assumes the upstream model remains compatible with current vLLM multimodal serving behavior; future vLLM or model updates may require extra launch flags.
