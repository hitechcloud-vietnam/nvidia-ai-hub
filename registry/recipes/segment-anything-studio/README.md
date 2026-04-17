# Segment Anything Studio

Local Gradio wrapper around the official Meta `Segment Anything` model for promptable segmentation and automatic mask generation on NVIDIA GPUs.

## What it provides

- Gradio web UI on port `7869`
- Official `segment-anything` Python package
- Promptable segmentation using one positive point coordinate
- Automatic mask generation across the whole image
- Exported overlay images and JSON metadata
- Persistent checkpoint and output storage

## Default access

- Web UI: `http://localhost:7869/`

## Included workflow

- Upload an image
- Enter a point coordinate for prompt-based segmentation, or run automatic mask generation
- Review the overlay and exported mask metadata
- Download saved PNG and JSON outputs

## Scope of this preset

This recipe intentionally provides a simple SAM baseline:

- uses the official Meta `segment-anything` package and checkpoint
- exposes promptable segmentation and automatic mask generation through a local Gradio UI
- persists checkpoints and exported outputs across restarts
- keeps the experience focused on image segmentation evaluation and workflow prototyping

This preset does **not** include:

- the upstream front-end-only React ONNX demo
- box prompts, multi-point prompts, or video segmentation workflows
- SAM 2 support
- production API hardening, auth, or multi-user controls

## Required configuration

Before first launch, review `registry/recipes/segment-anything-studio/.env` and change what applies to your environment:

- `APP_PORT`
- `PORT`
- `SAM_MODEL_TYPE`
- `SAM_CHECKPOINT_URL`
- `SAM_CHECKPOINT_FILE`
- checkpoint and output directory variables if you need different storage targets

## Runtime notes

- Upstream Segment Anything requires a model checkpoint such as `sam_vit_h_4b8939.pth`, `sam_vit_l_0b3195.pth`, or `sam_vit_b_01ec64.pth`.
- This recipe downloads the configured checkpoint on first launch if it is not already present in the persistent checkpoint volume.
- The upstream repository also provides a separate React + ONNX browser demo, but this recipe packages a local Python Gradio studio instead.
- Automatic mask generation can be compute-heavy on large images.

## Persistent data

This recipe stores state in Docker volumes for:

- `/data/checkpoints`
- `/data/output`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, Docker build recipe, startup wrapper, local Gradio app, and operator documentation for a SAM-based studio
- aligning the app workflow with upstream Segment Anything usage for prompt-based prediction and automatic mask generation
- wiring persistent checkpoint and exported-output storage
- checking the new recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, checkpoint download, GPU-backed inference, or actual mask quality, because Docker is not available in this Windows workspace
- box prompts, ONNX export, or browser-side ONNX demo workflows
- SAM 2 functionality

## License notes

- Upstream project: `facebookresearch/segment-anything`
- Upstream license: Apache-2.0
- Review downloaded model assets and downstream dataset usage separately when relevant

## Risk notes

- Large images and automatic mask generation can increase memory use and latency.
- This studio is a research and workflow tool, not a hardened production segmentation service.
- Operators switching checkpoints must keep `SAM_MODEL_TYPE` aligned with the chosen checkpoint file.
