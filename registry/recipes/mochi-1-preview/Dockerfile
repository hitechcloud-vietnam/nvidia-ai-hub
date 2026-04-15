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

WORKDIR /opt/mochi

RUN git clone --depth=1 https://github.com/genmoai/mochi.git /opt/mochi && \
    python3 -m venv /opt/mochi/venv && \
    /opt/mochi/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel uv && \
    /opt/mochi/venv/bin/pip install --no-cache-dir -e . --no-build-isolation

ENV PATH="/opt/mochi/venv/bin:${PATH}"
ENV HF_HOME=/data/hf-home

COPY launch.py /opt/mochi/launch.py
COPY start.sh /opt/mochi/start.sh
RUN chmod +x /opt/mochi/start.sh && mkdir -p /data/weights /data/hf-home /opt/mochi/outputs

EXPOSE 7860

CMD ["/opt/mochi/start.sh"]
