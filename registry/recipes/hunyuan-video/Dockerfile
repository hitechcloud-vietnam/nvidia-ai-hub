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

WORKDIR /opt/HunyuanVideo

RUN git clone --depth=1 https://github.com/Tencent-Hunyuan/HunyuanVideo /opt/HunyuanVideo && \
    python3 -m venv /opt/HunyuanVideo/venv && \
    /opt/HunyuanVideo/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/HunyuanVideo/venv/bin/pip install --no-cache-dir torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124 && \
    /opt/HunyuanVideo/venv/bin/pip install --no-cache-dir -r requirements.txt && \
    /opt/HunyuanVideo/venv/bin/pip install --no-cache-dir "huggingface_hub[cli]"

ENV PATH="/opt/HunyuanVideo/venv/bin:${PATH}"

COPY start.sh /opt/HunyuanVideo/start.sh
RUN chmod +x /opt/HunyuanVideo/start.sh && mkdir -p /opt/HunyuanVideo/ckpts /opt/HunyuanVideo/gradio_outputs

EXPOSE 8081

CMD ["/opt/HunyuanVideo/start.sh"]
