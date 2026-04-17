FROM ghcr.io/hitechcloud-vietnam/comfyui-spark:latest

ENV PIP_PREFER_BINARY=1
ENV GRADIO_ANALYTICS_ENABLED=False

RUN git clone --depth=1 https://github.com/ltdrdata/ComfyUI-Manager /app/ComfyUI/custom_nodes/comfyui-manager && \
    python3 -m pip install --no-cache-dir -r /app/ComfyUI/manager_requirements.txt && \
    if [ -f /app/ComfyUI/custom_nodes/comfyui-manager/requirements.txt ]; then python3 -m pip install --no-cache-dir -r /app/ComfyUI/custom_nodes/comfyui-manager/requirements.txt; fi

COPY start.sh /start.sh
RUN chmod +x /start.sh

WORKDIR /app/ComfyUI

EXPOSE 8188

CMD ["/start.sh"]
