#!/usr/bin/env bash
set -euo pipefail

cd /opt/rvc

mkdir -p \
  "${TEMP_ROOT:-/opt/rvc/TEMP}" \
  "${OUTPUT_ROOT:-/opt/rvc/opt}" \
  "${index_root:-/opt/rvc/logs}" \
  "${outside_index_root:-/opt/rvc/logs}" \
  "${weight_root:-/opt/rvc/assets/weights}" \
  "${weight_uvr5_root:-/opt/rvc/assets/uvr5_weights}" \
  /opt/rvc/assets/hubert \
  /opt/rvc/assets/pretrained \
  /opt/rvc/assets/pretrained_v2 \
  /opt/rvc/assets/rmvpe \
  /opt/rvc/assets/uvr5_weights/onnx_dereverb_By_FoxJoy

export TEMP="${TEMP_ROOT:-/opt/rvc/TEMP}"
export TMPDIR="${TEMP_ROOT:-/opt/rvc/TEMP}"

missing_assets=0
for required_file in \
  /opt/rvc/assets/hubert/hubert_base.pt \
  /opt/rvc/assets/rmvpe/rmvpe.pt \
  /opt/rvc/assets/pretrained/D32k.pth \
  /opt/rvc/assets/pretrained/G32k.pth \
  /opt/rvc/assets/uvr5_weights/HP2_all_vocals.pth; do
  if [ ! -f "${required_file}" ]; then
    missing_assets=1
    break
  fi
done

if [ "${missing_assets}" -eq 1 ]; then
  echo "Downloading required RVC assets on first launch..."
  python3 tools/download_models.py
fi

exec python3 infer-web.py \
  --port "${PORT:-7865}" \
  --pycmd "${RVC_PYTHON_CMD:-python3}" \
  --noautoopen
