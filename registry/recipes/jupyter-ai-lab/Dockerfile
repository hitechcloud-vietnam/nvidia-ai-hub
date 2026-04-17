FROM quay.io/jupyter/scipy-notebook:2025-12-31

RUN pip install --no-cache-dir \
    jupyter-ai==3.0.0 \
    jupyter-ai-magic-commands \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"
