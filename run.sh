#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

HOST=""
PORT=""

while [ $# -gt 0 ]; do
    case "$1" in
        --host)
            HOST="${2:-}"
            shift 2
            ;;
        --port)
            PORT="${2:-}"
            shift 2
            ;;
        *)
            echo "[nvidia-ai-hub] Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
fi

read_env_value() {
    local key="$1"
    local default_value="$2"
    if [ ! -f ".env" ]; then
        printf '%s' "$default_value"
        return
    fi
    local line
    line=$(grep -E "^${key}=" .env | tail -n 1 || true)
    if [ -z "$line" ]; then
        printf '%s' "$default_value"
        return
    fi
    printf '%s' "${line#*=}"
}

write_env_value() {
    local key="$1"
    local value="$2"
    if [ -f ".env" ] && grep -q -E "^${key}=" .env; then
        python3 - <<PY
from pathlib import Path
path = Path('.env')
key = ${key@Q}
value = ${value@Q}
lines = path.read_text(encoding='utf-8').splitlines()
updated = []
replaced = False
for line in lines:
    if line.startswith(f"{key}="):
        updated.append(f"{key}={value}")
        replaced = True
    else:
        updated.append(line)
if not replaced:
    updated.append(f"{key}={value}")
path.write_text("\n".join(updated).rstrip() + "\n", encoding='utf-8')
PY
    else
        printf '%s=%s\n' "$key" "$value" >> .env
    fi
}

if [ -n "$HOST" ]; then
    write_env_value "NVIDIA_AI_HUB_HOST" "$HOST"
fi

if [ -n "$PORT" ]; then
    write_env_value "NVIDIA_AI_HUB_PORT" "$PORT"
fi

HOST="${HOST:-$(read_env_value NVIDIA_AI_HUB_HOST 0.0.0.0)}"
PORT="${PORT:-$(read_env_value NVIDIA_AI_HUB_PORT 9000)}"

if [ ! -d ".venv" ]; then
    echo "[nvidia-ai-hub] Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

echo "[nvidia-ai-hub] Installing Python dependencies..."
pip install -q -r requirements.txt

if [ ! -d "frontend/node_modules" ]; then
    echo "[nvidia-ai-hub] Installing frontend dependencies..."
    (
        cd frontend
        npm install
    )
fi

if [ ! -f "frontend/dist/index.html" ] || [ "frontend/src" -nt "frontend/dist/index.html" ] || [ "frontend/package.json" -nt "frontend/dist/index.html" ]; then
    echo "[nvidia-ai-hub] Building frontend bundle..."
    (
        cd frontend
        npm run build
    )
fi

echo "[nvidia-ai-hub] Starting NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC on ${HOST}:${PORT}..."
exec uvicorn daemon.main:app --host "$HOST" --port "$PORT"
