#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    echo "[spark-ai-hub] Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

echo "[spark-ai-hub] Installing Python dependencies..."
pip install -q -r requirements.txt

echo "[spark-ai-hub] Starting NVIDIA AI Hub on port 9000..."
exec uvicorn daemon.main:app --host 0.0.0.0 --port 9000
