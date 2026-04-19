#!/usr/bin/env bash

nvidia_ai_hub_load_env() {
    local root="${1:-$PWD}"
    local env_file="$root/.env"

    if [ -f "$env_file" ]; then
        set -a
        # shellcheck disable=SC1090
        . "$env_file"
        set +a
    fi

    NVIDIA_AI_HUB_ROOT="$root"
    NVIDIA_AI_HUB_ENV_FILE="$env_file"
    NVIDIA_AI_HUB_HOST="${NVIDIA_AI_HUB_HOST:-0.0.0.0}"
    NVIDIA_AI_HUB_PORT="${NVIDIA_AI_HUB_PORT:-9000}"
    NVIDIA_AI_HUB_NODE_MAJOR="${NVIDIA_AI_HUB_NODE_MAJOR:-22}"
    NVIDIA_AI_HUB_FRONTEND_DIR_NAME="${NVIDIA_AI_HUB_FRONTEND_DIR:-frontend}"
    NVIDIA_AI_HUB_FRONTEND_DIR="$root/$NVIDIA_AI_HUB_FRONTEND_DIR_NAME"
    NVIDIA_AI_HUB_DIST_INDEX="$NVIDIA_AI_HUB_FRONTEND_DIR/dist/index.html"
}

nvidia_ai_hun_ensure_env_file() {
    local root="${1:-${NVIDIA_AI_HUB_ROOT:-$PWD}}"
    local env_file="$root/.env"
    local env_example="$root/.env.example"

    if [ ! -f "$env_file" ] && [ -f "$env_example" ]; then
        cp "$env_example" "$env_file"
    fi

    nvidia_ai_hub_load_env "$root"
}

nvidia_ai_hub_validate_port() {
    case "$1" in
        ''|*[!0-9]*)
            return 1
            ;;
    esac

    [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

nvidia_ai_hub_validate_host() {
    [ -n "${1:-}" ]
}

nvidia_ai_hub_write_env_value() {
    local key="$1"
    local value="$2"
    local env_file="${NVIDIA_AI_HUB_ENV_FILE:-$PWD/.env}"
    local temp_file

    mkdir -p "$(dirname "$env_file")"
    nvidia_ai_hub_ensure_env_file "${NVIDIA_AI_HUB_ROOT:-$PWD}"
    touch "$env_file"
    temp_file="$(mktemp)"

    if grep -q "^${key}=" "$env_file"; then
        sed "s#^${key}=.*#${key}=${value}#" "$env_file" > "$temp_file"
    else
        cat "$env_file" > "$temp_file"
        printf '%s=%s\n' "$key" "$value" >> "$temp_file"
    fi

    mv "$temp_file" "$env_file"
    export "$key=$value"
    nvidia_ai_hub_load_env "${NVIDIA_AI_HUB_ROOT:-$PWD}"
}

nvidia_ai_hub_command_exists() {
    command -v "$1" >/dev/null 2>&1
}

nvidia_ai_hub_node_major_version() {
    if ! nvidia_ai_hub_command_exists node; then
        echo "0"
        return
    fi

    node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0"
}

nvidia_ai_hub_frontend_needs_build() {
    if [ ! -f "$NVIDIA_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if [ "$NVIDIA_AI_HUB_FRONTEND_DIR/package.json" -nt "$NVIDIA_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$NVIDIA_AI_HUB_FRONTEND_DIR/package-lock.json" ] && [ "$NVIDIA_AI_HUB_FRONTEND_DIR/package-lock.json" -nt "$NVIDIA_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$NVIDIA_AI_HUB_FRONTEND_DIR/index.html" ] && [ "$NVIDIA_AI_HUB_FRONTEND_DIR/index.html" -nt "$NVIDIA_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$NVIDIA_AI_HUB_FRONTEND_DIR/vite.config.js" ] && [ "$NVIDIA_AI_HUB_FRONTEND_DIR/vite.config.js" -nt "$NVIDIA_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if find "$NVIDIA_AI_HUB_FRONTEND_DIR/src" "$NVIDIA_AI_HUB_FRONTEND_DIR/public" -type f -newer "$NVIDIA_AI_HUB_DIST_INDEX" 2>/dev/null | grep -q .; then
        return 0
    fi

    return 1
}

nvidia_ai_hub_frontend_toolchain_ready() {
    if ! nvidia_ai_hub_command_exists node || ! nvidia_ai_hub_command_exists npm; then
        return 1
    fi

    [ "$(nvidia_ai_hub_node_major_version)" -ge "$NVIDIA_AI_HUB_NODE_MAJOR" ]
}

nvidia_ai_hub_install_frontend_dependencies() {
    if [ -f "$NVIDIA_AI_HUB_FRONTEND_DIR/package-lock.json" ]; then
        (cd "$NVIDIA_AI_HUB_FRONTEND_DIR" && npm ci --no-fund --no-audit)
    else
        (cd "$NVIDIA_AI_HUB_FRONTEND_DIR" && npm install --no-fund --no-audit)
    fi
}

nvidia_ai_hub_build_frontend() {
    (cd "$NVIDIA_AI_HUB_FRONTEND_DIR" && npm run build)
}

nvidia_ai_hub_load_env "$PWD"