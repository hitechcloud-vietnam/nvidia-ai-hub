#!/usr/bin/env bash

SPARK_AI_HUB_PORT=9000
SPARK_AI_HUB_NODE_MAJOR=22
SPARK_AI_HUB_FRONTEND_DIR="frontend"
SPARK_AI_HUB_DIST_INDEX="frontend/dist/index.html"

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