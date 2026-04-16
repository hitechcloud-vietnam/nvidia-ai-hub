#!/usr/bin/env bash
set -euo pipefail

source /opt/conda/etc/profile.d/conda.sh
conda activate voicecraft

export USER="${USER:-voicecraft}"
export HOME="${HOME:-/root}"

mkdir -p \
  "${TMP_PATH:-/data/temp}" \
  "${MODELS_PATH:-/data/models}" \
  "${HF_HOME:-/data/hf-cache}" \
  "${XDG_CACHE_HOME:-/data/cache}" \
  "${TORCH_HOME:-/data/torch-cache}" \
  "${GRADIO_TEMP_DIR:-/data/gradio}" \
  "${NLTK_DATA:-/data/nltk}" \
  "${MPLCONFIGDIR:-/data/matplotlib}"

cd /opt/voicecraft

exec python gradio_app.py \
  --demo-path "${DEMO_PATH:-/opt/voicecraft/demo}" \
  --tmp-path "${TMP_PATH:-/data/temp}" \
  --models-path "${MODELS_PATH:-/data/models}" \
  --port "${PORT:-7860}" \
  --server_name "0.0.0.0"
