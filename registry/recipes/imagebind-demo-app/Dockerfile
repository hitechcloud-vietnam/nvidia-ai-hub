FROM nvcr.io/nvidia/cuda:13.0.1-devel-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1
ENV GRADIO_ANALYTICS_ENABLED=False
ENV HF_HUB_DISABLE_PROGRESS_BARS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv python3-dev \
    git curl ffmpeg libsndfile1 \
    libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:${PATH}"

RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu130 && \
    pip install --no-cache-dir \
      gradio \
      ftfy \
      regex \
      einops \
      timm \
      iopath \
      numpy>=1.19 \
      soundfile && \
    pip install --no-cache-dir git+https://github.com/facebookresearch/pytorchvideo.git@6cdc929315aab1b5674b6dcf73b16ec99147735f && \
    pip install --no-cache-dir git+https://github.com/facebookresearch/ImageBind.git

COPY app.py /app/app.py
COPY README.md /app/README.md

RUN mkdir -p /data/output /data/hf-home /data/torch-home

EXPOSE 7860

CMD ["python", "/app/app.py"]
