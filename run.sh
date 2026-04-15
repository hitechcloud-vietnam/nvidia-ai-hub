#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    echo "[nvidia-ai-hub] Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

echo "[nvidia-ai-hub] Installing Python dependencies..."
pip install -q -r requirements.txt

echo "[nvidia-ai-hub] Starting NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC on port 9000..."
exec uvicorn daemon.main:app --host 0.0.0.0 --port 9000
