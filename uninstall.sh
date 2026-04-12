#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="$HOME/spark-ai-hub"

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

remove_path() {
    local target="$1"
    local label="$2"

    if [ -e "$target" ]; then
        echo "[spark-ai-hub] Removing $label..."
        rm -rf "$target"
    else
        echo "[spark-ai-hub] $label not found, skipping."
    fi
}

echo ""
echo "  Spark AI Hub Uninstaller"
echo "  ====================="
echo ""

# ---------- recipe containers ----------

if command_exists docker; then
    # Check if there are any spark-ai-hub containers
    containers=$(docker ps -a --filter "name=spark-ai-hub-" --format "{{.Names}}" 2>/dev/null)

    if [ -n "$containers" ]; then
        echo "Installed apps found:"
        echo "$containers" | sed 's/^/  - /'
        echo ""
        read -rp "Remove all installed apps, their images, and volumes? [y/N] " remove_apps

        if [[ "$remove_apps" =~ ^[Yy]$ ]]; then
            # Find all spark-ai-hub compose projects
            projects=$(docker ps -a --filter "name=spark-ai-hub-" --format "{{.Labels}}" 2>/dev/null | \
                grep -oP 'com\.docker\.compose\.project=\Kspark-ai-hub-[^ ,]+' | sort -u)

            if [ -n "$projects" ]; then
                echo "[spark-ai-hub] Stopping and removing recipe containers..."
                for project in $projects; do
                    echo "  - $project"
                    docker compose -p "$project" down --rmi all --volumes 2>/dev/null || true
                done
            fi

            # Catch any remaining spark-ai-hub containers
            remaining=$(docker ps -a --filter "name=spark-ai-hub-" --format "{{.ID}}" 2>/dev/null)
            if [ -n "$remaining" ]; then
                echo "[spark-ai-hub] Removing leftover containers..."
                docker rm -f $remaining 2>/dev/null || true
            fi

            # Remove dangling spark-ai-hub volumes
            volumes=$(docker volume ls --filter "name=spark-ai-hub" --format "{{.Name}}" 2>/dev/null)
            if [ -n "$volumes" ]; then
                echo "[spark-ai-hub] Removing volumes..."
                docker volume rm $volumes 2>/dev/null || true
            fi
        else
            echo "[spark-ai-hub] Keeping installed apps."
        fi
    fi
fi

# ---------- clear project caches ----------

if [ -d "$INSTALL_DIR" ]; then
    remove_path "$INSTALL_DIR/.venv" "backend virtual environment"
    remove_path "$INSTALL_DIR/data" "backend runtime data"
    remove_path "$INSTALL_DIR/frontend/node_modules" "frontend node_modules cache"
    remove_path "$INSTALL_DIR/frontend/dist" "frontend build output"

    if [ -d "$INSTALL_DIR/registry/recipes" ]; then
        echo "[spark-ai-hub] Removing generated recipe environment files..."
        find "$INSTALL_DIR/registry/recipes" -maxdepth 2 -type f -name ".env" -print -delete 2>/dev/null || true
    fi

    echo "[spark-ai-hub] Removing Python cache directories..."
    find "$INSTALL_DIR" -type d \( -name "__pycache__" -o -name ".pytest_cache" -o -name ".mypy_cache" -o -name ".ruff_cache" \) -prune -print | \
        while IFS= read -r cache_dir; do
            [ -n "$cache_dir" ] && rm -rf "$cache_dir"
        done
else
    echo "[spark-ai-hub] $INSTALL_DIR not found, skipping cache cleanup."
fi

# ---------- remove spark-ai-hub directory ----------

if [ -d "$INSTALL_DIR" ]; then
    echo "[spark-ai-hub] Removing $INSTALL_DIR..."
    rm -rf "$INSTALL_DIR"
else
    echo "[spark-ai-hub] $INSTALL_DIR not found, skipping."
fi

echo ""
echo "[spark-ai-hub] Uninstall complete."
echo ""
