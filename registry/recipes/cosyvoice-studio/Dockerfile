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
    sox \
    libsox-dev \
    curl \
    ca-certificates \
    build-essential \
    libsndfile1 \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/CosyVoice

RUN git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git /opt/CosyVoice && \
    cd /opt/CosyVoice && \
    git submodule update --init --recursive && \
    python3 -m venv /opt/CosyVoice/venv && \
    /opt/CosyVoice/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/CosyVoice/venv/bin/pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126 && \
    /opt/CosyVoice/venv/bin/pip install --no-cache-dir -r requirements.txt

ENV PATH="/opt/CosyVoice/venv/bin:${PATH}"
ENV HF_HOME=/data/hf-cache
ENV MODELSCOPE_CACHE=/data/modelscope-cache

COPY start.sh /opt/CosyVoice/start.sh
RUN chmod +x /opt/CosyVoice/start.sh && mkdir -p /data/hf-cache /data/modelscope-cache /data/gradio

EXPOSE 7860

CMD ["/opt/CosyVoice/start.sh"]
