#!/usr/bin/env bash
set -euo pipefail

cd /opt/Wonder3D

mkdir -p /opt/Wonder3D/outputs /opt/Wonder3D/sam_pt "${HF_HOME:-/root/.cache/huggingface}" "${U2NET_HOME:-/data/u2net}"

if [ ! -f /opt/Wonder3D/sam_pt/sam_vit_h_4b8939.pth ]; then
  curl -L https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -o /opt/Wonder3D/sam_pt/sam_vit_h_4b8939.pth
fi

exec python3 /opt/Wonder3D/launch.py
