#!/usr/bin/env bash

spark_load_env() {
    local root="${1:-$PWD}"
    local env_file="$root/.env"

    if [ -f "$env_file" ]; then
        set -a
        # shellcheck disable=SC1090
        . "$env_file"
        set +a
    fi

    SPARK_AI_HUB_ROOT="$root"
    SPARK_AI_HUB_ENV_FILE="$env_file"
    SPARK_AI_HUB_HOST="${SPARK_AI_HUB_HOST:-0.0.0.0}"
    SPARK_AI_HUB_PORT="${SPARK_AI_HUB_PORT:-9000}"
    SPARK_AI_HUB_NODE_MAJOR="${SPARK_AI_HUB_NODE_MAJOR:-22}"
    SPARK_AI_HUB_FRONTEND_DIR_NAME="${SPARK_AI_HUB_FRONTEND_DIR:-frontend}"
    SPARK_AI_HUB_FRONTEND_DIR="$root/$SPARK_AI_HUB_FRONTEND_DIR_NAME"
    SPARK_AI_HUB_DIST_INDEX="$SPARK_AI_HUB_FRONTEND_DIR/dist/index.html"
}

spark_validate_port() {
    case "$1" in
        ''|*[!0-9]*)
            return 1
            ;;
    esac

    [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

spark_write_env_value() {
    local key="$1"
    local value="$2"
    local env_file="${SPARK_AI_HUB_ENV_FILE:-$PWD/.env}"
    local temp_file

    mkdir -p "$(dirname "$env_file")"
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
    spark_load_env "${SPARK_AI_HUB_ROOT:-$PWD}"
}

spark_command_exists() {
    command -v "$1" >/dev/null 2>&1
}

spark_node_major_version() {
    if ! spark_command_exists node; then
        echo "0"
        return
    fi

    node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0"
}

spark_frontend_needs_build() {
    if [ ! -f "$SPARK_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if [ "$SPARK_AI_HUB_FRONTEND_DIR/package.json" -nt "$SPARK_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$SPARK_AI_HUB_FRONTEND_DIR/package-lock.json" ] && [ "$SPARK_AI_HUB_FRONTEND_DIR/package-lock.json" -nt "$SPARK_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$SPARK_AI_HUB_FRONTEND_DIR/index.html" ] && [ "$SPARK_AI_HUB_FRONTEND_DIR/index.html" -nt "$SPARK_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if [ -f "$SPARK_AI_HUB_FRONTEND_DIR/vite.config.js" ] && [ "$SPARK_AI_HUB_FRONTEND_DIR/vite.config.js" -nt "$SPARK_AI_HUB_DIST_INDEX" ]; then
        return 0
    fi

    if find "$SPARK_AI_HUB_FRONTEND_DIR/src" "$SPARK_AI_HUB_FRONTEND_DIR/public" -type f -newer "$SPARK_AI_HUB_DIST_INDEX" 2>/dev/null | grep -q .; then
        return 0
    fi

    return 1
}

spark_frontend_toolchain_ready() {
    if ! spark_command_exists node || ! spark_command_exists npm; then
        return 1
    fi

    [ "$(spark_node_major_version)" -ge "$SPARK_AI_HUB_NODE_MAJOR" ]
}

spark_install_frontend_dependencies() {
    if [ -f "$SPARK_AI_HUB_FRONTEND_DIR/package-lock.json" ]; then
        (cd "$SPARK_AI_HUB_FRONTEND_DIR" && npm ci --no-fund --no-audit)
    else
        (cd "$SPARK_AI_HUB_FRONTEND_DIR" && npm install --no-fund --no-audit)
    fi
}

spark_build_frontend() {
    (cd "$SPARK_AI_HUB_FRONTEND_DIR" && npm run build)
}

spark_load_env "$PWD"