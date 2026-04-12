#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f ./scripts/common.sh ]; then
    # shellcheck source=/dev/null
    source ./scripts/common.sh
fi

REPO="https://github.com/hitechcloud-vietnam/spark-ai-hub.git"
INSTALL_DIR="$HOME/spark-ai-hub"
PORT="${SPARK_AI_HUB_PORT:-9000}"
HOST="${SPARK_AI_HUB_HOST:-0.0.0.0}"
NODE_MAJOR="${SPARK_AI_HUB_NODE_MAJOR:-22}"
START_AFTER_INSTALL=true
PORT_OVERRIDE=""

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

usage() {
        cat <<'EOF'
Usage: install.sh [--no-start]

Options:
    --no-start   Install/update dependencies and build the frontend, but do not start the server
    --port PORT  Install/update using a specific port
    -h, --help   Show this help message
EOF
}

validate_port() {
    if command -v spark_validate_port >/dev/null 2>&1; then
        spark_validate_port "$1"
        return
    fi

    case "$1" in
        ''|*[!0-9]*)
            return 1
            ;;
    esac
    [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

ensure_nodejs() {
    local installed_major
    installed_major="$(spark_node_major_version)"

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

while [ "$#" -gt 0 ]; do
    case "$1" in
        --no-start)
            START_AFTER_INSTALL=false
            ;;
        --port)
            shift
            if [ "$#" -eq 0 ] || ! validate_port "$1"; then
                echo "[spark-ai-hub] --port requires a value between 1 and 65535." >&2
                exit 1
            fi
            PORT_OVERRIDE="$1"
            ;;
        --port=*)
            PORT_OVERRIDE="${1#*=}"
            if ! validate_port "$PORT_OVERRIDE"; then
                echo "[spark-ai-hub] --port requires a value between 1 and 65535." >&2
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

# ---------- git ----------

if ! spark_command_exists git; then
    echo "[spark-ai-hub] Installing git..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq git
fi

# ---------- python3 + venv ----------

if ! spark_command_exists python3; then
    echo "[spark-ai-hub] Installing python3..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq python3 python3-venv python3-pip
elif ! python3 -m venv --help &>/dev/null 2>&1; then
    echo "[spark-ai-hub] Installing python3-venv..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq python3-venv
fi

# ---------- docker ----------

if ! spark_command_exists docker; then
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

if [ -f ./scripts/common.sh ]; then
    # shellcheck source=/dev/null
    source ./scripts/common.sh
fi

if [ -n "$PORT_OVERRIDE" ] && command -v spark_write_env_value >/dev/null 2>&1; then
    spark_write_env_value "SPARK_AI_HUB_PORT" "$PORT_OVERRIDE"
fi

PORT="${PORT_OVERRIDE:-${SPARK_AI_HUB_PORT:-$PORT}}"
HOST="${SPARK_AI_HUB_HOST:-$HOST}"
NODE_MAJOR="${SPARK_AI_HUB_NODE_MAJOR:-$NODE_MAJOR}"

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

should_build_frontend=false
if spark_frontend_needs_build; then
    should_build_frontend=true
fi

echo "[spark-ai-hub] Installing frontend dependencies..."
spark_install_frontend_dependencies

if [ "$should_build_frontend" = true ]; then
    echo "[spark-ai-hub] Building frontend..."
    spark_build_frontend
else
    echo "[spark-ai-hub] Frontend build is up to date, skipping rebuild."
fi

# ---------- launch ----------

echo ""
echo "[spark-ai-hub] Installation complete!"
echo "[spark-ai-hub] Backend API and frontend UI are ready."

if [ "$START_AFTER_INSTALL" = false ]; then
    echo "[spark-ai-hub] --no-start was specified, so the server was not started."
    echo "[spark-ai-hub] Run ./check.sh to verify the environment before launch."
    echo "[spark-ai-hub] Run ./run.sh to start Spark AI Hub later."
    echo ""
    exit 0
fi

echo "[spark-ai-hub] Starting Spark AI Hub on port $PORT..."
echo "[spark-ai-hub] Open http://localhost:$PORT in your browser"
echo ""

SPARK_AI_HUB_PORT="$PORT" exec uvicorn daemon.main:app --host "$HOST" --port "$PORT"
