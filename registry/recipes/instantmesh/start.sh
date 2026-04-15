#!/usr/bin/env bash
set -euo pipefail

cd /opt/InstantMesh

mkdir -p /opt/InstantMesh/ckpts "${HF_HOME:-/data/hf-home}" "${U2NET_HOME:-/data/u2net}" "${TMPDIR:-/data/outputs}"

exec python3 app.py
