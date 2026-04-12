#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/hitechcloud-vietnam/spark-ai-hub.git"
INSTALL_DIR="$HOME/spark-ai-hub"
PORT=9000
NODE_MAJOR=22
FRONTEND_DIR="frontend"
DIST_INDEX="frontend/dist/index.html"

echo ""
echo "  Spark AI Hub Installer"
echo "  ==================="
echo ""

# ---------- helpers ----------

need_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    else
        sudo "$@"
    fi
}

apt_updated=false
ensure_apt_updated() {
    if [ "$apt_updated" = false ]; then
        echo "[spark-ai-hub] Updating package lists..."
        need_sudo apt-get update -qq
        apt_updated=true
    fi
}

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

ensure_nodejs() {
    local installed_major
    installed_major="$(node_major_version)"

    if [ "$installed_major" -ge "$NODE_MAJOR" ]; then
        return
    fi

    echo "[spark-ai-hub] Installing Node.js ${NODE_MAJOR}.x for frontend build..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq ca-certificates curl gnupg

    need_sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
        need_sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    need_sudo chmod a+r /etc/apt/keyrings/nodesource.gpg

    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | \
        need_sudo tee /etc/apt/sources.list.d/nodesource.list > /dev/null

    need_sudo apt-get update -qq
    need_sudo apt-get install -y -qq nodejs
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

# ---------- git ----------

if ! command_exists git; then
    echo "[spark-ai-hub] Installing git..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq git
fi

# ---------- python3 + venv ----------

if ! command_exists python3; then
    echo "[spark-ai-hub] Installing python3..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq python3 python3-venv python3-pip
elif ! python3 -m venv --help &>/dev/null 2>&1; then
    echo "[spark-ai-hub] Installing python3-venv..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq python3-venv
fi

# ---------- docker ----------

if ! command_exists docker; then
    echo "[spark-ai-hub] Installing Docker Engine..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq ca-certificates curl

    # Add Docker official GPG key and repo
    need_sudo install -m 0755 -d /etc/apt/keyrings
    need_sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    need_sudo chmod a+r /etc/apt/keyrings/docker.asc

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        need_sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    need_sudo apt-get update -qq
    need_sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Let current user run docker without sudo
    need_sudo usermod -aG docker "$USER"
    echo "[spark-ai-hub] Added $USER to docker group (takes effect on next login or after 'newgrp docker')"
fi

# ---------- node.js for frontend ----------

ensure_nodejs

# ---------- clone or update ----------

if [ -d "$INSTALL_DIR" ]; then
    echo "[spark-ai-hub] Updating existing installation..."
    git -C "$INSTALL_DIR" pull --ff-only
else
    echo "[spark-ai-hub] Cloning Spark AI Hub..."
    git clone "$REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ---------- python venv + deps ----------

if [ ! -d ".venv" ]; then
    echo "[spark-ai-hub] Creating virtual environment..."
    python3 -m venv .venv
fi
source .venv/bin/activate
echo "[spark-ai-hub] Installing Python dependencies..."
python -m pip install --upgrade -q pip
pip install -q -r requirements.txt

# ---------- frontend deps + production build ----------

echo "[spark-ai-hub] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
eval "$(npm_install_command)"

if frontend_needs_build; then
    echo "[spark-ai-hub] Building frontend..."
    npm run build
else
    echo "[spark-ai-hub] Frontend build is up to date, skipping rebuild."
fi

cd ..

# ---------- launch ----------

echo ""
echo "[spark-ai-hub] Installation complete!"
echo "[spark-ai-hub] Backend API and frontend UI are ready."
echo "[spark-ai-hub] Starting Spark AI Hub on port $PORT..."
echo "[spark-ai-hub] Open http://localhost:$PORT in your browser"
echo ""

exec uvicorn daemon.main:app --host 0.0.0.0 --port "$PORT"
