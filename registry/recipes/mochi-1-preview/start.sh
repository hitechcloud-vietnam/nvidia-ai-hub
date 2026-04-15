#!/usr/bin/env bash
set -euo pipefail

cd /opt/mochi

MODEL_DIR="${MOCHI_MODEL_DIR:-/data/weights}"
PORT="${PORT:-7860}"
SERVER_NAME="${GRADIO_SERVER_NAME:-0.0.0.0}"
CPU_OFFLOAD_FLAG=""

mkdir -p "$MODEL_DIR" /opt/mochi/outputs

if [ -z "$(find "$MODEL_DIR" -mindepth 1 -maxdepth 1 2>/dev/null)" ]; then
  python3 ./scripts/download_weights.py "$MODEL_DIR"
fi

if [ "${MOCHI_CPU_OFFLOAD:-1}" = "1" ] || [ "${MOCHI_CPU_OFFLOAD:-1}" = "true" ]; then
  CPU_OFFLOAD_FLAG="--cpu_offload"
fi

exec python3 /opt/mochi/launch.py --model_dir "$MODEL_DIR" --port "$PORT" --server-name "$SERVER_NAME" ${CPU_OFFLOAD_FLAG}
