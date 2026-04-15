FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

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
    libegl1-mesa-dev \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/InstantMesh

RUN git clone --depth=1 https://github.com/TencentARC/InstantMesh /opt/InstantMesh && \
    python3 -m venv /opt/InstantMesh/venv && \
    /opt/InstantMesh/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/InstantMesh/venv/bin/pip install --no-cache-dir ninja triton && \
    /opt/InstantMesh/venv/bin/pip install --no-cache-dir torch==2.1.0 torchvision==0.16.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cu121 && \
    /opt/InstantMesh/venv/bin/pip install --no-cache-dir xformers==0.0.22.post7 && \
    /opt/InstantMesh/venv/bin/pip install --no-cache-dir -r requirements.txt

ENV PATH="/opt/InstantMesh/venv/bin:${PATH}"
ENV HF_HOME=/data/hf-home
ENV HUGGINGFACE_HUB_CACHE=/data/hf-home
ENV U2NET_HOME=/data/u2net
ENV TMPDIR=/data/outputs

COPY start.sh /opt/InstantMesh/start.sh
RUN chmod +x /opt/InstantMesh/start.sh && mkdir -p /opt/InstantMesh/ckpts /data/hf-home /data/u2net /data/outputs

EXPOSE 43839

CMD ["/opt/InstantMesh/start.sh"]
