# Kosmos-2.5 for Spark AI Hub

Local Gradio wrapper for `microsoft/kosmos-2.5` focused on OCR and image-to-markdown extraction from text-rich images.

## Runtime notes

- Requires a CUDA-capable GPU.
- Uses Transformers support for `Kosmos2_5ForConditionalGeneration`.
- Default task is controlled through `KOSMOS_TASK` in `.env`.
- Model outputs are generative and may hallucinate; verify OCR and markdown results before downstream use.
