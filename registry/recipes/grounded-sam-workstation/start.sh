#!/usr/bin/env bash
set -euo pipefail

cd /opt/Grounded-Segment-Anything

mkdir -p /data/checkpoints /data/outputs "${HF_HOME:-/data/hf-home}"

GROUNDINGDINO_CHECKPOINT_URL="${GROUNDINGDINO_CHECKPOINT_URL:-https://github.com/IDEA-Research/GroundingDINO/releases/download/v0.1.0-alpha/groundingdino_swint_ogc.pth}"
SAM_CHECKPOINT_URL="${SAM_CHECKPOINT_URL:-https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth}"
GRADIO_SERVER_PORT="${GRADIO_SERVER_PORT:-7589}"

if [ ! -f /data/checkpoints/groundingdino_swint_ogc.pth ]; then
  wget -O /data/checkpoints/groundingdino_swint_ogc.pth "${GROUNDINGDINO_CHECKPOINT_URL}"
fi

if [ ! -f /data/checkpoints/sam_vit_h_4b8939.pth ]; then
  wget -O /data/checkpoints/sam_vit_h_4b8939.pth "${SAM_CHECKPOINT_URL}"
fi

ln -sfn /data/checkpoints/groundingdino_swint_ogc.pth /opt/Grounded-Segment-Anything/groundingdino_swint_ogc.pth
ln -sfn /data/checkpoints/sam_vit_h_4b8939.pth /opt/Grounded-Segment-Anything/sam_vit_h_4b8939.pth
rm -rf /opt/Grounded-Segment-Anything/outputs
ln -sfn /data/outputs /opt/Grounded-Segment-Anything/outputs

if [ -n "${GROUNDING_SAM_EXTRA_ARGS:-}" ]; then
  # shellcheck disable=SC2086
  exec python gradio_app.py --port "${GRADIO_SERVER_PORT}" ${GROUNDING_SAM_EXTRA_ARGS}
fi

exec python gradio_app.py --port "${GRADIO_SERVER_PORT}"
