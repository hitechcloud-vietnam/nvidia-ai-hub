#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source ./scripts/common.sh

if [ ! -d ".venv" ]; then
    echo "[spark-ai-hub] Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

echo "[spark-ai-hub] Installing Python dependencies..."
pip install -q -r requirements.txt

if spark_frontend_needs_build; then
    if ! spark_command_exists node || ! spark_command_exists npm; then
        echo "[spark-ai-hub] Frontend build is missing or outdated, but Node.js/npm is not available."
        echo "[spark-ai-hub] Please run install.sh to provision frontend build dependencies."
        exit 1
    fi

    if ! spark_frontend_toolchain_ready; then
        echo "[spark-ai-hub] Node.js ${SPARK_AI_HUB_NODE_MAJOR}.x or newer is required to rebuild the frontend."
        echo "[spark-ai-hub] Please run install.sh to install the required Node.js version."
        exit 1
    fi

    echo "[spark-ai-hub] Installing frontend dependencies..."
    spark_install_frontend_dependencies

    echo "[spark-ai-hub] Building frontend..."
    spark_build_frontend
else
    echo "[spark-ai-hub] Frontend build is up to date."
fi

echo "[spark-ai-hub] Starting Spark AI Hub on port $SPARK_AI_HUB_PORT..."
exec uvicorn daemon.main:app --host 0.0.0.0 --port "$SPARK_AI_HUB_PORT"
