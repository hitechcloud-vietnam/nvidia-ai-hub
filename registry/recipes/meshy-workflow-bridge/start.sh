#!/usr/bin/env bash
set -euo pipefail

cd /app/ComfyUI

if [ -n "${MESHY_API_KEY:-}" ]; then
  echo "Meshy API key provided through environment. Enter it in the 'Meshy - API Key' node when building a workflow."
else
  echo "No Meshy API key configured. Add one in the UI via the 'Meshy - API Key' node before running Meshy tasks."
fi

exec python3 main.py ${CLI_ARGS:---listen 0.0.0.0 --port 8188}
