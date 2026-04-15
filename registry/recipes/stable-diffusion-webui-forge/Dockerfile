FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1
ENV GRADIO_ANALYTICS_ENABLED=False
ENV HF_HOME=/data/.huggingface

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    ca-certificates \
    build-essential \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/forge

RUN git clone --depth=1 https://github.com/lllyasviel/stable-diffusion-webui-forge.git /opt/forge && \
    python3 -m venv /opt/forge/venv && \
    /opt/forge/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel

ENV PATH="/opt/forge/venv/bin:${PATH}"

EXPOSE 7860

CMD ["bash", "-lc", "cd /opt/forge && python launch.py"]
