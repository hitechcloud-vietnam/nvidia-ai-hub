#!/usr/bin/env bash
set -euo pipefail

cd /opt/HunyuanVideo

MODEL_BASE="${MODEL_BASE:-/opt/HunyuanVideo/ckpts}"
mkdir -p "$MODEL_BASE" /opt/HunyuanVideo/gradio_outputs

if [ ! -d "$MODEL_BASE/hunyuan-video-t2v-720p" ]; then
  huggingface-cli download tencent/HunyuanVideo --local-dir "$MODEL_BASE"
fi

if [ ! -d "$MODEL_BASE/text_encoder" ]; then
  if [ ! -d "$MODEL_BASE/llava-llama-3-8b-v1_1-transformers" ]; then
    huggingface-cli download xtuner/llava-llama-3-8b-v1_1-transformers --local-dir "$MODEL_BASE/llava-llama-3-8b-v1_1-transformers"
  fi
  python3 hyvideo/utils/preprocess_text_encoder_tokenizer_utils.py \
    --input_dir "$MODEL_BASE/llava-llama-3-8b-v1_1-transformers" \
    --output_dir "$MODEL_BASE/text_encoder"
fi

if [ ! -d "$MODEL_BASE/text_encoder_2" ]; then
  huggingface-cli download openai/clip-vit-large-patch14 --local-dir "$MODEL_BASE/text_encoder_2"
fi

EXTRA_ARGS="${HUNYUAN_EXTRA_ARGS:-}"
if [ "${HUNYUAN_USE_CPU_OFFLOAD:-1}" = "1" ] || [ "${HUNYUAN_USE_CPU_OFFLOAD:-1}" = "true" ]; then
  EXTRA_ARGS="--use-cpu-offload ${EXTRA_ARGS}"
fi

exec python3 gradio_server.py --model-base "$MODEL_BASE" ${EXTRA_ARGS}
