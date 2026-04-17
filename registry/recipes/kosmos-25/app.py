import os
import re
import torch
import gradio as gr
from PIL import Image, ImageDraw
from transformers import AutoProcessor, Kosmos2_5ForConditionalGeneration

MODEL_ID = os.environ.get("KOSMOS_MODEL", "microsoft/kosmos-2.5")
DEFAULT_TASK = os.environ.get("KOSMOS_TASK", "ocr").lower()
PORT = int(os.environ.get("PORT", "7860"))
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
DTYPE = torch.bfloat16 if torch.cuda.is_available() else torch.float32

if torch.cuda.is_available():
    model = Kosmos2_5ForConditionalGeneration.from_pretrained(MODEL_ID, device_map=DEVICE, torch_dtype=DTYPE)
else:
    model = Kosmos2_5ForConditionalGeneration.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
    model.to(DEVICE)
processor = AutoProcessor.from_pretrained(MODEL_ID)
model.eval()


def post_process_ocr(text, prompt, scale_height, scale_width):
    y = text.replace(prompt, "")
    pattern = r"<bbox><x_\d+><y_\d+><x_\d+><y_\d+></bbox>"
    bboxs_raw = re.findall(pattern, y)
    lines = re.split(pattern, y)[1:]
    bboxs = [re.findall(r"\d+", i) for i in bboxs_raw]
    bboxs = [[int(j) for j in i] for i in bboxs]
    info_lines = []
    for idx in range(min(len(lines), len(bboxs))):
        x0, y0, x1, y1 = bboxs[idx]
        if x0 >= x1 or y0 >= y1:
            continue
        x0 = int(x0 * scale_width)
        y0 = int(y0 * scale_height)
        x1 = int(x1 * scale_width)
        y1 = int(y1 * scale_height)
        text_line = lines[idx].strip()
        info_lines.append(f"{x0},{y0},{x1},{y0},{x1},{y1},{x0},{y1},{text_line}")
    return "\n".join(info_lines)


def run_inference(image, task):
    if image is None:
        raise gr.Error("Please upload an image.")

    prompt = "<md>" if task == "md" else "<ocr>"
    inputs = processor(text=prompt, images=image, return_tensors="pt")
    height, width = inputs.pop("height"), inputs.pop("width")
    if hasattr(height, "item"):
        height = height.item()
    if hasattr(width, "item"):
        width = width.item()
    raw_width, raw_height = image.size
    scale_height = raw_height / height
    scale_width = raw_width / width

    inputs = {k: v.to(DEVICE) if v is not None else None for k, v in inputs.items()}
    if inputs.get("flattened_patches") is not None:
        inputs["flattened_patches"] = inputs["flattened_patches"].to(DTYPE)

    with torch.inference_mode():
        generated_ids = model.generate(**inputs, max_new_tokens=1024)
    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

    if task == "md":
        return image, generated_text.replace(prompt, "").strip()

    output_text = post_process_ocr(generated_text, prompt, scale_height, scale_width)
    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)
    for line in output_text.splitlines():
        parts = line.split(",")
        if len(parts) < 9:
            continue
        polygon = list(map(int, parts[:8]))
        draw.polygon(polygon, outline="red")
    return annotated, output_text


with gr.Blocks(title="Kosmos-2.5") as demo:
    gr.Markdown(
        "# Kosmos-2.5 Instruct\nUpload a text-rich image and run OCR or image-to-markdown extraction locally on NVIDIA GPUs."
    )
    with gr.Row():
        with gr.Column():
            image_input = gr.Image(type="pil", label="Input image")
            task_input = gr.Radio(["ocr", "md"], value=DEFAULT_TASK if DEFAULT_TASK in {"ocr", "md"} else "ocr", label="Task")
            run_button = gr.Button("Run")
        with gr.Column():
            image_output = gr.Image(type="pil", label="Annotated output")
            text_output = gr.Textbox(label="Result", lines=18)

    run_button.click(fn=run_inference, inputs=[image_input, task_input], outputs=[image_output, text_output], show_progress=True)


demo.launch(server_name="0.0.0.0", server_port=PORT)
