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

WORKDIR /opt/cogvideo

RUN git clone --depth=1 https://github.com/THUDM/CogVideo.git /opt/cogvideo && \
    python3 -m venv /opt/cogvideo/venv && \
    /opt/cogvideo/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/cogvideo/venv/bin/pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 && \
    /opt/cogvideo/venv/bin/pip install --no-cache-dir -r /opt/cogvideo/inference/gradio_composite_demo/requirements.txt

ENV PATH="/opt/cogvideo/venv/bin:${PATH}"
ENV HF_HOME=/root/.cache/huggingface

COPY launch.py /opt/cogvideo/launch.py
COPY start.sh /opt/cogvideo/start.sh
RUN chmod +x /opt/cogvideo/start.sh && \
    mkdir -p /opt/cogvideo/inference/gradio_composite_demo/output /opt/cogvideo/inference/gradio_composite_demo/gradio_tmp

EXPOSE 7860

CMD ["/opt/cogvideo/start.sh"]
