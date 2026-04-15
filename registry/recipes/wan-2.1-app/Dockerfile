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
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/Wan2.1

RUN git clone --depth=1 https://github.com/Wan-Video/Wan2.1 /opt/Wan2.1 && \
    python3 -m venv /opt/Wan2.1/venv && \
    /opt/Wan2.1/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/Wan2.1/venv/bin/pip install --no-cache-dir ninja packaging && \
    /opt/Wan2.1/venv/bin/pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 && \
    /opt/Wan2.1/venv/bin/pip install --no-cache-dir -r requirements.txt && \
    /opt/Wan2.1/venv/bin/pip install --no-cache-dir "huggingface_hub[cli]"

ENV PATH="/opt/Wan2.1/venv/bin:${PATH}"
ENV HF_HOME=/data/hf-home

COPY launch.py /opt/Wan2.1/launch.py
COPY start.sh /opt/Wan2.1/start.sh
RUN chmod +x /opt/Wan2.1/start.sh && mkdir -p /data/models /data/hf-home /opt/Wan2.1/outputs

EXPOSE 7860

CMD ["/opt/Wan2.1/start.sh"]
