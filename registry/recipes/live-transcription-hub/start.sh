#!/usr/bin/env bash
set -euo pipefail

mkdir -p "${HF_HOME:-/data/hf-cache}" "${OUTPUT_DIR:-/data/output}" "${TEMP_DIR:-/data/tmp}"
exec python /app/app.py