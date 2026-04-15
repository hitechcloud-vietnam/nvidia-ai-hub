FROM nvidia/cuda:12.6.3-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1
ENV GRADIO_ANALYTICS_ENABLED=False
ENV HF_HUB_DISABLE_PROGRESS_BARS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
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

WORKDIR /opt/framepack

RUN git clone --depth=1 https://github.com/lllyasviel/FramePack.git /opt/framepack && \
    python3 -m venv /opt/framepack/venv && \
    /opt/framepack/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/framepack/venv/bin/pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126 && \
    /opt/framepack/venv/bin/pip install --no-cache-dir -r requirements.txt

ENV PATH="/opt/framepack/venv/bin:${PATH}"
ENV HF_HOME=/opt/framepack/hf_download

RUN mkdir -p /opt/framepack/outputs /opt/framepack/hf_download

EXPOSE 7860
