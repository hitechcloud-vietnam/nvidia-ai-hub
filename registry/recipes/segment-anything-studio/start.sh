#!/usr/bin/env bash
set -euo pipefail

CHECKPOINT_DIR="${CHECKPOINT_DIR:-/data/checkpoints}"
CHECKPOINT_FILE="${SAM_CHECKPOINT_FILE:-sam_vit_h_4b8939.pth}"
CHECKPOINT_URL="${SAM_CHECKPOINT_URL:-https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth}"

mkdir -p "$CHECKPOINT_DIR" "${OUTPUT_DIR:-/data/output}"

if [ ! -f "$CHECKPOINT_DIR/$CHECKPOINT_FILE" ]; then
  wget -O "$CHECKPOINT_DIR/$CHECKPOINT_FILE" "$CHECKPOINT_URL"
fi

exec python /app/app.py
