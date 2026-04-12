#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source ./scripts/common.sh

PORT_OVERRIDE=""
HOST_OVERRIDE=""

usage() {
    cat <<'EOF'
Usage: run.sh [--port PORT] [--host HOST]

Options:
  --port PORT  Run Spark AI Hub on a specific port for this session
    --host HOST  Run Spark AI Hub on a specific host for this session
  -h, --help   Show this help message
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --port)
            shift
            if [ "$#" -eq 0 ] || ! spark_validate_port "$1"; then
                echo "[spark-ai-hub] --port requires a value between 1 and 65535." >&2
                exit 1
            fi
            PORT_OVERRIDE="$1"
            ;;
        --port=*)
            PORT_OVERRIDE="${1#*=}"
            if ! spark_validate_port "$PORT_OVERRIDE"; then
                echo "[spark-ai-hub] --port requires a value between 1 and 65535." >&2
                exit 1
            fi
            ;;
        --host)
            shift
            if [ "$#" -eq 0 ] || ! spark_validate_host "$1"; then
                echo "[spark-ai-hub] --host requires a non-empty value." >&2
                exit 1
            fi
            HOST_OVERRIDE="$1"
            ;;
        --host=*)
            HOST_OVERRIDE="${1#*=}"
            if ! spark_validate_host "$HOST_OVERRIDE"; then
                echo "[spark-ai-hub] --host requires a non-empty value." >&2
                exit 1
            fi
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "[spark-ai-hub] Unknown option: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
    shift
done

PORT="${PORT_OVERRIDE:-$SPARK_AI_HUB_PORT}"
HOST="${HOST_OVERRIDE:-$SPARK_AI_HUB_HOST}"

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

echo "[spark-ai-hub] Starting Spark AI Hub on port $PORT..."
SPARK_AI_HUB_PORT="$PORT" SPARK_AI_HUB_HOST="$HOST" exec uvicorn daemon.main:app --host "$HOST" --port "$PORT"
