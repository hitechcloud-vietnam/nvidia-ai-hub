#!/usr/bin/env bash
set -euo pipefail

export PORT="${PORT:-8000}"
export LOG_LEVEL="${LOG_LEVEL:-INFO}"

exec uvicorn app:app --host 0.0.0.0 --port "${PORT}" --log-level "$(printf '%s' "${LOG_LEVEL}" | tr '[:upper:]' '[:lower:]')"
