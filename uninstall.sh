#!/usr/bin/env bash
set -e

INSTALL_DIR="$HOME/spark-ai-hub"

echo ""
echo "  Spark AI Hub Uninstaller"
echo "  ====================="
echo ""

# ---------- recipe containers ----------

if command -v docker &>/dev/null; then
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
