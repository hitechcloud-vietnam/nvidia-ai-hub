#!/usr/bin/env bash
set -e

REPO="https://github.com/WaxacaBytes/spark-ai-hub.git"
INSTALL_DIR="$HOME/spark-ai-hub"
PORT=9000

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

# ---------- git ----------

if ! command -v git &>/dev/null; then
    echo "[spark-ai-hub] Installing git..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq git
fi

# ---------- python3 + venv ----------

if ! command -v python3 &>/dev/null; then
    echo "[spark-ai-hub] Installing python3..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq python3 python3-venv python3-pip
elif ! python3 -m venv --help &>/dev/null 2>&1; then
    echo "[spark-ai-hub] Installing python3-venv..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq python3-venv
fi

# ---------- docker ----------

if ! command -v docker &>/dev/null; then
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
pip install -q -r requirements.txt

# ---------- launch ----------

echo ""
echo "[spark-ai-hub] Installation complete!"
echo "[spark-ai-hub] Starting Spark AI Hub on port $PORT..."
echo "[spark-ai-hub] Open http://localhost:$PORT in your browser"
echo ""

exec uvicorn daemon.main:app --host 0.0.0.0 --port "$PORT"
