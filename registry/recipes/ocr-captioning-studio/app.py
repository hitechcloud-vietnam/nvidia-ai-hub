import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import gradio as gr
import torch
from huggingface_hub import login
from PIL import Image, ImageDraw, ImageOps
from transformers import AutoModelForCausalLM, AutoProcessor

MODEL_ID = os.getenv("FLORENCE_MODEL", "microsoft/Florence-2-large-ft")
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
PORT = int(os.getenv("PORT", "7860"))
MAX_NEW_TOKENS = int(os.getenv("MAX_NEW_TOKENS", "1024"))
NUM_BEAMS = int(os.getenv("NUM_BEAMS", "3"))
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
TORCH_DTYPE = torch.float16 if torch.cuda.is_available() else torch.float32

TASK_PROMPTS = {
    "OCR": "<OCR>",
    "OCR with region": "<OCR_WITH_REGION>",
    "Caption": "<CAPTION>",
    "Detailed caption": "<DETAILED_CAPTION>",
    "More detailed caption": "<MORE_DETAILED_CAPTION>",
    "Dense region caption": "<DENSE_REGION_CAPTION>",
}

MODEL = None
PROCESSOR = None
MODEL_LOCK = Lock()

hf_token = os.getenv("HF_TOKEN") or os.getenv("hf")
if hf_token:
    try:
        login(token=hf_token, add_to_git_credential=False)
    except Exception as exc:  # pragma: no cover
        print(f"Failed to authenticate with Hugging Face token: {exc}")


def get_components():
    global MODEL, PROCESSOR

    with MODEL_LOCK:
        if MODEL is None or PROCESSOR is None:
            processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_ID,
                torch_dtype=TORCH_DTYPE,
                trust_remote_code=True,
            )
            model = model.to(DEVICE)
            model.eval()
            MODEL = model
            PROCESSOR = processor

    return MODEL, PROCESSOR


def normalize_image(image):
    if image is None:
        raise gr.Error("Please upload an image.")

    if isinstance(image, Image.Image):
        return ImageOps.exif_transpose(image).convert("RGB")

    if isinstance(image, str):
        with Image.open(image) as opened:
            return ImageOps.exif_transpose(opened).convert("RGB")

    raise gr.Error("Unsupported image input.")


def draw_quad_boxes(image, quads, labels):
    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)

    for quad, label in zip(quads, labels):
        if len(quad) != 8:
            continue
        points = [(int(quad[i]), int(quad[i + 1])) for i in range(0, 8, 2)]
        draw.polygon(points, outline="red", width=3)
        if label:
            x, y = points[0]
            draw.text((x + 4, y + 4), str(label), fill="red")

    return annotated


def draw_bbox_boxes(image, boxes, labels):
    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)

    for box, label in zip(boxes, labels):
        if len(box) != 4:
            continue
        x1, y1, x2, y2 = [int(value) for value in box]
        draw.rectangle((x1, y1, x2, y2), outline="red", width=3)
        if label:
            draw.text((x1 + 4, y1 + 4), str(label), fill="red")

    return annotated


def save_output(image, task_name):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    safe_task = task_name.lower().replace(" ", "-")
    output_path = OUTPUT_DIR / f"ocr-captioning-studio-{safe_task}-{stamp}.png"
    image.save(output_path)
    return str(output_path)


def run_task(image, task_name):
    pil_image = normalize_image(image)
    task_prompt = TASK_PROMPTS.get(task_name)
    if not task_prompt:
        raise gr.Error(f"Unsupported task: {task_name}")

    model, processor = get_components()
    inputs = processor(text=task_prompt, images=pil_image, return_tensors="pt")
    inputs = {
        key: value.to(DEVICE, TORCH_DTYPE) if hasattr(value, "to") else value
        for key, value in inputs.items()
    }

    with torch.inference_mode():
        generated_ids = model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            num_beams=NUM_BEAMS,
        )

    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
    parsed = processor.post_process_generation(
        generated_text,
        task=task_prompt,
        image_size=(pil_image.width, pil_image.height),
    )

    parsed_result = parsed.get(task_prompt, parsed)
    annotated = pil_image
    text_output = ""

    if task_prompt == "<OCR_WITH_REGION>":
        quads = parsed_result.get("quad_boxes", [])
        labels = parsed_result.get("labels", [])
        annotated = draw_quad_boxes(pil_image, quads, labels)
        text_output = "\n".join(str(label) for label in labels)
    elif task_prompt == "<DENSE_REGION_CAPTION>":
        boxes = parsed_result.get("bboxes", [])
        labels = parsed_result.get("labels", [])
        annotated = draw_bbox_boxes(pil_image, boxes, labels)
        text_output = "\n".join(
            f"{box}: {label}" for box, label in zip(boxes, labels)
        )
    elif task_prompt == "<OCR>":
        text_output = str(parsed_result)
    else:
        text_output = str(parsed_result)

    saved_path = save_output(annotated, task_name)
    return annotated, text_output, saved_path


CSS = """
#app-shell {
  margin: 0 auto;
  max-width: 1180px;
}
#run-button {
  min-height: 44px;
}
"""


with gr.Blocks(title="OCR + Captioning Studio", css=CSS) as demo:
    with gr.Column(elem_id="app-shell"):
        gr.Markdown(
            """
            # OCR + Captioning Studio
            Run `microsoft/Florence-2-large-ft` locally for OCR, OCR with region overlays, captioning, and dense region captioning.

            First launch downloads the Florence-2 model into a persistent Hugging Face cache volume.
            """
        )

        with gr.Row():
            with gr.Column(scale=1):
                image_input = gr.Image(type="pil", label="Input image")
                task_input = gr.Dropdown(
                    label="Task",
                    choices=list(TASK_PROMPTS.keys()),
                    value="OCR with region",
                )
                run_button = gr.Button("Run Task", variant="primary", elem_id="run-button")
            with gr.Column(scale=1):
                image_output = gr.Image(type="pil", label="Annotated output")
                text_output = gr.Textbox(label="Parsed result", lines=18)

        saved_file = gr.File(label="Saved output")

    run_button.click(
        fn=run_task,
        inputs=[image_input, task_input],
        outputs=[image_output, text_output, saved_file],
        show_progress=True,
    )


demo.launch(server_name="0.0.0.0", server_port=PORT)
