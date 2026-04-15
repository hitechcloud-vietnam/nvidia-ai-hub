FROM pytorch/pytorch:1.13.1-cuda11.6-cudnn8-devel

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1
ENV AM_I_DOCKER=True
ENV BUILD_WITH_CUDA=True
ENV CUDA_HOME=/usr/local/cuda
ENV GRADIO_ANALYTICS_ENABLED=False
ENV HF_HUB_DISABLE_PROGRESS_BARS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ffmpeg \
    git \
    ca-certificates \
    build-essential \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/Grounded-Segment-Anything

RUN git clone --depth=1 https://github.com/IDEA-Research/Grounded-Segment-Anything /opt/Grounded-Segment-Anything && \
    python -m pip install --no-cache-dir --upgrade pip setuptools wheel && \
    python -m pip install --no-cache-dir -e segment_anything && \
    python -m pip install --no-cache-dir --no-build-isolation -e GroundingDINO && \
    python -m pip install --no-cache-dir -r requirements.txt && \
    python -m pip install --no-cache-dir scipy openai

ENV HF_HOME=/data/hf-home
ENV HUGGINGFACE_HUB_CACHE=/data/hf-home

COPY start.sh /opt/Grounded-Segment-Anything/start.sh
RUN chmod +x /opt/Grounded-Segment-Anything/start.sh && mkdir -p /data/checkpoints /data/hf-home /data/outputs

EXPOSE 7589

CMD ["/opt/Grounded-Segment-Anything/start.sh"]
