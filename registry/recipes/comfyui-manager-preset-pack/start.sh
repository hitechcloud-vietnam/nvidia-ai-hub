#!/usr/bin/env bash
set -euo pipefail

cd /app/ComfyUI

MANAGER_BASE="/app/ComfyUI/user/__manager"
mkdir -p "$MANAGER_BASE" "$MANAGER_BASE/components" "$MANAGER_BASE/snapshots" "$MANAGER_BASE/startup-scripts"

CONFIG_FILE="$MANAGER_BASE/config.ini"
if [ ! -f "$CONFIG_FILE" ]; then
  cat > "$CONFIG_FILE" <<EOF
[default]
use_uv = ${COMFYUI_MANAGER_USE_UV:-False}
bypass_ssl = ${COMFYUI_MANAGER_BYPASS_SSL:-False}
file_logging = ${COMFYUI_MANAGER_FILE_LOGGING:-True}
windows_selector_event_loop_policy = ${COMFYUI_MANAGER_WINDOWS_SELECTOR_EVENT_LOOP_POLICY:-False}
security_level = ${COMFYUI_MANAGER_SECURITY_LEVEL:-normal}
network_mode = ${COMFYUI_MANAGER_NETWORK_MODE:-public}
EOF
fi

echo "ComfyUI-Manager config: $CONFIG_FILE"
echo "Component packs directory: $MANAGER_BASE/components"
echo "Snapshots directory: $MANAGER_BASE/snapshots"

exec python3 main.py ${CLI_ARGS:---listen 0.0.0.0 --port 8188 --enable-manager}
