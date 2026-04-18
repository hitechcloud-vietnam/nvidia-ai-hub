#!/usr/bin/env bash
set -e

REPO="https://github.com/hitechcloud-vietnam/nvidia-ai-hub.git"
INSTALL_DIR="$HOME/nvidia-ai-hub"
PORT=9000
HOST="0.0.0.0"
NO_START=false

echo ""
echo "  NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC Installer"
echo "  ==================="
echo ""

# ---------- helpers ----------

while [ $# -gt 0 ]; do
    case "$1" in
        --no-start)
            NO_START=true
            shift
            ;;
        --host)
            HOST="${2:-$HOST}"
            shift 2
            ;;
        --port)
            PORT="${2:-$PORT}"
            shift 2
            ;;
        *)
            echo "[nvidia-ai-hub] Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

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
        echo "[nvidia-ai-hub] Updating package lists..."
        need_sudo apt-get update -qq
        apt_updated=true
    fi
}

# ---------- git ----------

if ! command -v git &>/dev/null; then
    echo "[nvidia-ai-hub] Installing git..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq git
fi

# ---------- python3 + venv ----------

if ! command -v python3 &>/dev/null; then
    echo "[nvidia-ai-hub] Installing python3..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq python3 python3-venv python3-pip
elif ! python3 -m venv --help &>/dev/null 2>&1; then
    echo "[nvidia-ai-hub] Installing python3-venv..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq python3-venv
fi

# ---------- docker ----------

if ! command -v docker &>/dev/null; then
    echo "[nvidia-ai-hub] Installing Docker Engine..."
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
    echo "[nvidia-ai-hub] Added $USER to docker group (takes effect on next login or after 'newgrp docker')"
fi

# ---------- clone or update ----------

if [ -d "$INSTALL_DIR" ]; then
    echo "[nvidia-ai-hub] Updating existing installation..."
    git -C "$INSTALL_DIR" pull --ff-only
else
    echo "[nvidia-ai-hub] Cloning NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC..."
    git clone "$REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ---------- python venv + deps ----------

if [ ! -d ".venv" ]; then
    echo "[nvidia-ai-hub] Creating virtual environment..."
    python3 -m venv .venv
fi
source .venv/bin/activate
echo "[nvidia-ai-hub] Installing Python dependencies..."
pip install -q -r requirements.txt

# ---------- frontend toolchain + build ----------

ensure_node_22() {
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
        if [ "$NODE_MAJOR" -ge 22 ]; then
            return
        fi
    fi

    echo "[nvidia-ai-hub] Installing Node.js 22.x..."
    ensure_apt_updated
    need_sudo apt-get install -y -qq ca-certificates curl gnupg
    if [ ! -f /etc/apt/keyrings/nodesource.gpg ]; then
        need_sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | need_sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    fi
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | need_sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
    need_sudo apt-get update -qq
    need_sudo apt-get install -y -qq nodejs
}

ensure_node_22

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
fi

python3 - <<PY
from pathlib import Path
path = Path('.env')
existing = {}
if path.is_file():
    for raw in path.read_text(encoding='utf-8').splitlines():
        if not raw or raw.lstrip().startswith('#') or '=' not in raw:
            continue
        key, value = raw.split('=', 1)
        existing[key.strip()] = value.strip()
existing['NVIDIA_AI_HUB_HOST'] = ${HOST@Q}
existing['NVIDIA_AI_HUB_PORT'] = ${PORT@Q}
lines = [f"{key}={value}" for key, value in existing.items()]
path.write_text("\n".join(lines).rstrip() + "\n", encoding='utf-8')
PY

echo "[nvidia-ai-hub] Installing frontend dependencies..."
(
    cd frontend
    npm install
    echo "[nvidia-ai-hub] Building frontend bundle..."
    npm run build
)

# ---------- launch ----------

echo ""
echo "[nvidia-ai-hub] Installation complete!"
echo "[nvidia-ai-hub] Configuration saved to $INSTALL_DIR/.env"
echo "[nvidia-ai-hub] Host: $HOST"
echo "[nvidia-ai-hub] Port: $PORT"
echo "[nvidia-ai-hub] Open http://localhost:$PORT in your browser"
echo ""

if [ "$NO_START" = true ]; then
    echo "[nvidia-ai-hub] --no-start requested; skipping server launch."
    exit 0
fi

exec ./run.sh --host "$HOST" --port "$PORT"
