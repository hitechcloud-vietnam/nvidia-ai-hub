FROM nvcr.io/nvidia/cuda:13.0.1-devel-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv python3-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:${PATH}"

RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir \
      fastapi \
      uvicorn[standard] \
      python-multipart \
      faster-whisper \
      "huggingface_hub[hf_xet]"

COPY app.py /app/app.py
COPY README.md /app/README.md

RUN mkdir -p /data/output /data/hf-cache

EXPOSE 8000

CMD ["python", "/app/app.py"]
