#!/usr/bin/env bash
set -euo pipefail

cd /opt/triposr

PORT="${GRADIO_SERVER_PORT:-7860}"
SERVER_NAME="${GRADIO_SERVER_NAME:-0.0.0.0}"
EXTRA_ARGS="${TRIPOSR_ARGS:-}"

exec python3 gradio_app.py --listen --port "$PORT" ${EXTRA_ARGS}
