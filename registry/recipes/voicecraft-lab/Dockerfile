FROM nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_PREFER_BINARY=1
ENV GRADIO_ANALYTICS_ENABLED=False
ENV HF_HUB_DISABLE_PROGRESS_BARS=1
ENV CONDA_DIR=/opt/conda
ENV PATH=/opt/conda/bin:${PATH}

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    ca-certificates \
    curl \
    ffmpeg \
    festival \
    flac \
    git \
    libasound2-dev \
    libespeak-dev \
    libespeak1 \
    libglib2.0-0 \
    libgl1 \
    libsndfile1-dev \
    libxml2-dev \
    libxslt-dev \
    espeak-data \
    espeak-ng \
    vorbis-tools \
    wget \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN wget -q https://repo.anaconda.com/miniconda/Miniconda3-py39_24.3.0-0-Linux-x86_64.sh -O /tmp/miniconda.sh && \
    bash /tmp/miniconda.sh -b -p ${CONDA_DIR} && \
    rm -f /tmp/miniconda.sh

RUN conda update -y -n base -c conda-forge conda && \
    conda create -y -n voicecraft python=3.9.16 && \
    conda run -n voicecraft conda install -y -c conda-forge montreal-forced-aligner=2.2.17 openfst=1.8.2 kaldi=5.5.1068 && \
    conda run -n voicecraft mfa model download dictionary english_us_arpa && \
    conda run -n voicecraft mfa model download acoustic english_us_arpa && \
    conda clean -afy

RUN git clone --depth 1 https://github.com/jasonppy/VoiceCraft.git /opt/voicecraft
WORKDIR /opt/voicecraft

RUN conda run -n voicecraft pip install --no-cache-dir --upgrade pip setuptools wheel && \
    conda run -n voicecraft pip install --no-cache-dir "numpy<2" && \
    conda run -n voicecraft pip install --no-cache-dir torch==2.0.1 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cu117 && \
    conda run -n voicecraft pip install --no-cache-dir xformers==0.0.22 tensorboard==2.16.2 phonemizer==3.2.1 datasets==2.16.0 torchmetrics==0.11.1 huggingface_hub==0.22.2 && \
    conda run -n voicecraft pip install --no-cache-dir -e git+https://github.com/facebookresearch/audiocraft.git@c5157b5bf14bf83449c17ea1eeb66c19fb4bc7f0#egg=audiocraft && \
    conda run -n voicecraft pip install --no-cache-dir -r gradio_requirements.txt

COPY start.sh /start.sh
RUN chmod +x /start.sh && \
    mkdir -p /data/temp /data/models /data/hf-cache /data/cache /data/torch-cache /data/gradio /data/nltk /data/matplotlib

EXPOSE 7860

CMD ["/start.sh"]
