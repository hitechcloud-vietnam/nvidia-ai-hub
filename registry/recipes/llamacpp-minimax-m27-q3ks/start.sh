#!/bin/sh
set -e

LAST_SHARD=/models/UD-Q3_K_S/MiniMax-M2.7-UD-Q3_K_S-00003-of-00003.gguf
EXPECTED_BYTES=43000000000

shard_complete() {
    [ -f "$LAST_SHARD" ] && [ "$(stat -c%s "$LAST_SHARD" 2>/dev/null || echo 0)" -ge "$EXPECTED_BYTES" ]
}

if ! shard_complete; then
    echo "[nvidia-ai-hub] Downloading MiniMax-M2.7 UD-Q3_K_S (~94 GB)..."
    huggingface-cli download unsloth/MiniMax-M2.7-GGUF \
        --include 'UD-Q3_K_S/*' \
        --local-dir /models
fi

exec /app/llama-server "$@"