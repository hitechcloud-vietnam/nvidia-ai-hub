FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
ENV DOTNET_CLI_UI_LANGUAGE=en

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        python3 \
        python3-venv \
        python3-pip \
        libicu70 \
        libgomp1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /SwarmUI

RUN git clone https://github.com/mcmonkeyprojects/SwarmUI /SwarmUI

RUN rm -f /SwarmUI/launchtools/dotnet-install.sh \
    && curl -fsSL https://dot.net/v1/dotnet-install.sh -o /SwarmUI/launchtools/dotnet-install.sh \
    && chmod +x /SwarmUI/launchtools/dotnet-install.sh \
    && /SwarmUI/launchtools/dotnet-install.sh --channel 8.0 --runtime aspnetcore --install-dir /SwarmUI/.dotnet \
    && /SwarmUI/launchtools/dotnet-install.sh --channel 8.0 --install-dir /SwarmUI/.dotnet \
    && rm -f /SwarmUI/launchtools/dotnet-install.sh

RUN mkdir -p /SwarmUI/Models /SwarmUI/Output /SwarmUI/Data /SwarmUI/dlbackend /SwarmUI/src/BuiltinExtensions/ComfyUIBackend/CustomWorkflows /SwarmUI/src/BuiltinExtensions/ComfyUIBackend/DLNodes /SwarmUI/src/Extensions

EXPOSE 7801
