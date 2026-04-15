FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04

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

WORKDIR /opt/triposr

RUN git clone --depth=1 https://github.com/VAST-AI-Research/TripoSR.git /opt/triposr && \
    python3 -m venv /opt/triposr/venv && \
    /opt/triposr/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/triposr/venv/bin/pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 && \
    /opt/triposr/venv/bin/pip install --no-cache-dir -r requirements.txt

ENV PATH="/opt/triposr/venv/bin:${PATH}"

COPY start.sh /opt/triposr/start.sh
RUN chmod +x /opt/triposr/start.sh

EXPOSE 7860

CMD ["/opt/triposr/start.sh"]
