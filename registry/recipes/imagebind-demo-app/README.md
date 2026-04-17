# ImageBind Demo App

Local Gradio wrapper around the official Meta `ImageBind` model for cross-modal similarity experiments across text, images, and audio on NVIDIA GPUs.

## What it provides

- Gradio web UI on port `7868`
- Official pretrained `imagebind_huge` model loading through the upstream `ImageBind` package
- Cross-modal cosine-similarity matrices for image-to-text, audio-to-text, and image-to-audio comparisons
- Persistent cache volumes for downloaded model assets
- Exported JSON reports for each comparison run

## Default access

- Web UI: `http://localhost:7868/`

## Included workflow

- Enter one text prompt per line
- Upload one or more image files
- Upload one or more audio clips
- Run the comparison to generate similarity tables and a saved JSON report

## Scope of this preset

This recipe intentionally provides a narrow ImageBind demo baseline:

- uses the official `facebookresearch/ImageBind` package and pretrained `imagebind_huge` weights
- focuses on practical cross-modal embedding comparisons across text, images, and audio
- persists model cache and exported reports across restarts
- keeps the interface simple enough for retrieval and embedding sanity checks

This preset does **not** include:

- a production inference API
- video, depth, thermal, or IMU upload workflows
- benchmark dashboards, vector database integration, or large-scale indexing
- commercial-use clearance for the upstream non-commercial model license

## Required configuration

Before first launch, review `registry/recipes/imagebind-demo-app/.env` and change what applies to your environment:

- `APP_PORT`
- `PORT`
- `IMAGEBIND_MODEL`
- `MAX_TEXT_ITEMS`
- cache and output directory environment variables if you need different mount targets

## Runtime notes

- Upstream ImageBind examples demonstrate cross-modal embedding extraction across text, image, and audio inputs.
- First launch downloads pretrained weights and Python dependencies, so startup can take materially longer than later restarts.
- Audio decoding depends on `ffmpeg` and `libsndfile1`, which are included in the image.
- This recipe exposes a web demo only; it does not add a formal REST inference contract.

## Persistent data

This recipe stores state in Docker volumes for:

- `/data/hf-home`
- `/data/torch-home`
- `/data/output`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, Docker build recipe, local Gradio app, and operator documentation for the ImageBind demo
- aligning the app workflow with upstream ImageBind usage for text, image, and audio embedding comparison
- wiring persistent cache and exported-report storage
- checking the new recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, model download, GPU-backed execution, or actual similarity outputs, because Docker is not available in this Windows workspace
- performance or memory fit on the target NVIDIA GPU host
- additional modalities beyond text, image, and audio

## License notes

- Upstream project and model weights: `facebookresearch/ImageBind`
- Upstream license: CC-BY-NC 4.0
- This upstream license is non-commercial; review whether that license is acceptable before operational use

## Risk notes

- The upstream non-commercial license can block many enterprise or production deployment scenarios.
- Large batch inputs can increase GPU memory usage and startup latency.
- The demo is best treated as a research or evaluation surface rather than a hardened multi-user service.
