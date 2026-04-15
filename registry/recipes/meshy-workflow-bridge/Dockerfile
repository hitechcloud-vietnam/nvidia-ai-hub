FROM ghcr.io/hitechcloud-vietnam/comfyui-spark:latest

ENV PIP_PREFER_BINARY=1
ENV GRADIO_ANALYTICS_ENABLED=False
ENV MESHY_API_KEY=

WORKDIR /app/ComfyUI/custom_nodes

RUN git clone --depth=1 https://github.com/Kazama-Suichiku/ComfyUI-Meshy.git /app/ComfyUI/custom_nodes/ComfyUI-Meshy && \
    python3 -m pip install --no-cache-dir -r /app/ComfyUI/custom_nodes/ComfyUI-Meshy/requirements.txt

COPY start.sh /start.sh
RUN chmod +x /start.sh

WORKDIR /app/ComfyUI

EXPOSE 8188

CMD ["/start.sh"]
