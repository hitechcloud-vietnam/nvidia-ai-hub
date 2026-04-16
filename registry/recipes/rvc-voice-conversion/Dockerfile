FROM nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1
ENV GRADIO_ANALYTICS_ENABLED=False

RUN apt-get update && apt-get install -y --no-install-recommends \
    aria2 \
    bash \
    build-essential \
    curl \
    ffmpeg \
    git \
    libgl1 \
    libglib2.0-0 \
    libsndfile1 \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI.git /opt/rvc
WORKDIR /opt/rvc

RUN python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel && \
    python3 -m pip install --no-cache-dir "numpy<2" && \
    python3 -m pip install --no-cache-dir torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cu118 && \
    python3 -m pip install --no-cache-dir -r requirements-py311.txt

COPY start.sh /start.sh
RUN chmod +x /start.sh && \
    mkdir -p \
      /opt/rvc/assets/hubert \
      /opt/rvc/assets/pretrained \
      /opt/rvc/assets/pretrained_v2 \
      /opt/rvc/assets/rmvpe \
      /opt/rvc/assets/uvr5_weights/onnx_dereverb_By_FoxJoy \
      /opt/rvc/assets/weights \
      /opt/rvc/logs \
      /opt/rvc/opt \
      /opt/rvc/TEMP

EXPOSE 7865

CMD ["/start.sh"]
