FROM nvidia/cuda:11.7.1-cudnn8-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1
ENV GRADIO_ANALYTICS_ENABLED=False
ENV HF_HUB_DISABLE_PROGRESS_BARS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    git \
    ffmpeg \
    curl \
    ca-certificates \
    build-essential \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/Wonder3D

RUN git clone --depth=1 https://github.com/xxlong0/Wonder3D /opt/Wonder3D && \
    python3 -m venv /opt/Wonder3D/venv && \
    /opt/Wonder3D/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/Wonder3D/venv/bin/pip install --no-cache-dir ninja fire && \
    /opt/Wonder3D/venv/bin/pip install --no-cache-dir -r requirements.txt && \
    /opt/Wonder3D/venv/bin/pip install --no-cache-dir git+https://github.com/NVlabs/tiny-cuda-nn/#subdirectory=bindings/torch

ENV PATH="/opt/Wonder3D/venv/bin:${PATH}"
ENV HF_HOME=/root/.cache/huggingface
ENV HUGGINGFACE_HUB_CACHE=/root/.cache/huggingface
ENV U2NET_HOME=/data/u2net

COPY launch.py /opt/Wonder3D/launch.py
COPY start.sh /opt/Wonder3D/start.sh
RUN chmod +x /opt/Wonder3D/start.sh && mkdir -p /opt/Wonder3D/outputs /opt/Wonder3D/sam_pt /root/.cache/huggingface /data/u2net

EXPOSE 7860

CMD ["/opt/Wonder3D/start.sh"]
