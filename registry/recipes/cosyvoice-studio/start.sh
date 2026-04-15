#!/usr/bin/env bash
set -euo pipefail

source /opt/CosyVoice/venv/bin/activate

exec python /opt/CosyVoice/webui.py \
  --port "${PORT:-7860}" \
  --model_dir "${COSYVOICE_MODEL:-FunAudioLLM/Fun-CosyVoice3-0.5B-2512}"
