#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

NODE_MAJOR=22
FRONTEND_DIR="frontend"
DIST_INDEX="frontend/dist/index.html"

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

node_major_version() {
    if ! command_exists node; then
        echo "0"
        return
    fi

    node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0"
}

npm_install_command() {
    if [ -f package-lock.json ]; then
        echo "npm ci --no-fund --no-audit"
    else
        echo "npm install --no-fund --no-audit"
    fi
}

frontend_needs_build() {
    if [ ! -f "$DIST_INDEX" ]; then
        return 0
    fi

    if [ "$FRONTEND_DIR/package.json" -nt "$DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$FRONTEND_DIR/package-lock.json" ] && [ "$FRONTEND_DIR/package-lock.json" -nt "$DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$FRONTEND_DIR/index.html" ] && [ "$FRONTEND_DIR/index.html" -nt "$DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$FRONTEND_DIR/vite.config.js" ] && [ "$FRONTEND_DIR/vite.config.js" -nt "$DIST_INDEX" ]; then
        return 0
    fi

    if find "$FRONTEND_DIR/src" "$FRONTEND_DIR/public" -type f -newer "$DIST_INDEX" 2>/dev/null | grep -q .; then
        return 0
    fi

    return 1
}

if [ ! -d ".venv" ]; then
    echo "[spark-ai-hub] Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

echo "[spark-ai-hub] Installing Python dependencies..."
pip install -q -r requirements.txt

if frontend_needs_build; then
    if ! command_exists node || ! command_exists npm; then
        echo "[spark-ai-hub] Frontend build is missing or outdated, but Node.js/npm is not available."
        echo "[spark-ai-hub] Please run install.sh to provision frontend build dependencies."
        exit 1
    fi

    if [ "$(node_major_version)" -lt "$NODE_MAJOR" ]; then
        echo "[spark-ai-hub] Node.js ${NODE_MAJOR}.x or newer is required to rebuild the frontend."
        echo "[spark-ai-hub] Please run install.sh to install the required Node.js version."
        exit 1
    fi

    echo "[spark-ai-hub] Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    eval "$(npm_install_command)"

    echo "[spark-ai-hub] Building frontend..."
    npm run build
    cd ..
else
    echo "[spark-ai-hub] Frontend build is up to date."
fi

echo "[spark-ai-hub] Starting Spark AI Hub on port 9000..."
exec uvicorn daemon.main:app --host 0.0.0.0 --port 9000
