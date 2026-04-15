#!/usr/bin/env bash
set -euo pipefail

cd /opt/Wan2.1

MODEL_DIR="${WAN_CKPT_DIR:-/data/models/Wan2.1-T2V-14B}"
MODEL_REPO="${WAN_MODEL_REPO:-Wan-AI/Wan2.1-T2V-14B}"
MODEL_NAME="${WAN_MODEL_NAME:-t2v-14B}"
PORT="${GRADIO_SERVER_PORT:-7860}"
SERVER_NAME="${GRADIO_SERVER_NAME:-0.0.0.0}"

mkdir -p "$MODEL_DIR" /opt/Wan2.1/outputs

if [ -z "$(find "$MODEL_DIR" -mindepth 1 -maxdepth 1 2>/dev/null)" ]; then
  huggingface-cli download "$MODEL_REPO" --local-dir "$MODEL_DIR"
fi

exec python3 /opt/Wan2.1/launch.py --ckpt_dir "$MODEL_DIR" --model_name "$MODEL_NAME" --server-name "$SERVER_NAME" --port "$PORT"
