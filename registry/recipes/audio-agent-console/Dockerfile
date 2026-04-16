FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir \
      fastapi \
      uvicorn[standard] \
      python-dotenv \
      pipecat-ai[webrtc] \
      pipecat-ai-small-webrtc-prebuilt \
      openai

COPY app.py /app/app.py
COPY start.sh /app/start.sh
COPY README.md /app/README.md

RUN chmod +x /app/start.sh && mkdir -p /data

EXPOSE 8000

CMD ["/bin/bash", "/app/start.sh"]
