import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import gradio as gr
import torch
from imagebind import data
from imagebind.models import imagebind_model
from imagebind.models.imagebind_model import ModalityType

PORT = int(os.getenv("PORT", "7860"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
MAX_TEXT_ITEMS = int(os.getenv("MAX_TEXT_ITEMS", "12"))
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

MODEL = None
MODEL_LOCK = Lock()


def get_model():
    global MODEL

    with MODEL_LOCK:
        if MODEL is None:
            model = imagebind_model.imagebind_huge(pretrained=True)
            model.eval()
            model.to(DEVICE)
            MODEL = model

    return MODEL


def parse_text_items(raw_text: str):
    items = [line.strip() for line in (raw_text or "").splitlines() if line.strip()]
    return items[:MAX_TEXT_ITEMS]


def normalize_file_list(file_items):
    if not file_items:
        return []
    if isinstance(file_items, str):
        return [file_items]
    normalized = []
    for item in file_items:
        if isinstance(item, str):
            normalized.append(item)
        elif hasattr(item, "name"):
            normalized.append(item.name)
    return normalized


def safe_label(prefix: str, path: str):
    return f"{prefix}:{Path(path).name}"


def compute_similarity(source_embeddings, target_embeddings):
    source_embeddings = source_embeddings / source_embeddings.norm(dim=-1, keepdim=True)
    target_embeddings = target_embeddings / target_embeddings.norm(dim=-1, keepdim=True)
    return (source_embeddings @ target_embeddings.T).detach().cpu()


def matrix_to_markdown(title, row_labels, col_labels, matrix):
    lines = [f"### {title}", ""]
    header = ["item"] + col_labels
    lines.append("| " + " | ".join(header) + " |")
    lines.append("| " + " | ".join(["---"] * len(header)) + " |")
    for row_label, row in zip(row_labels, matrix.tolist()):
        values = [f"{value:.4f}" for value in row]
        lines.append("| " + " | ".join([row_label] + values) + " |")
    return "\n".join(lines)


def write_report(payload):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    report_path = OUTPUT_DIR / f"imagebind-report-{stamp}.json"
    report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return str(report_path)


def run_demo(text_block, image_files, audio_files):
    text_items = parse_text_items(text_block)
    image_paths = normalize_file_list(image_files)
    audio_paths = normalize_file_list(audio_files)

    if not text_items and not image_paths and not audio_paths:
        raise gr.Error("Provide at least one text prompt, image, or audio clip.")

    modality_inputs = {}
    labels = {}

    if text_items:
        modality_inputs[ModalityType.TEXT] = data.load_and_transform_text(text_items, DEVICE)
        labels["text"] = [f"text:{idx + 1}" for idx in range(len(text_items))]
    if image_paths:
        modality_inputs[ModalityType.VISION] = data.load_and_transform_vision_data(image_paths, DEVICE)
        labels["vision"] = [safe_label("image", path) for path in image_paths]
    if audio_paths:
        modality_inputs[ModalityType.AUDIO] = data.load_and_transform_audio_data(audio_paths, DEVICE)
        labels["audio"] = [safe_label("audio", path) for path in audio_paths]

    model = get_model()
    with torch.inference_mode():
        embeddings = model(modality_inputs)

    sections = []
    report = {
        "device": DEVICE,
        "text_items": text_items,
        "image_files": image_paths,
        "audio_files": audio_paths,
        "similarities": {},
    }

    pairings = [
        ("vision", ModalityType.VISION, "text", ModalityType.TEXT, "Image x Text similarity"),
        ("audio", ModalityType.AUDIO, "text", ModalityType.TEXT, "Audio x Text similarity"),
        ("vision", ModalityType.VISION, "audio", ModalityType.AUDIO, "Image x Audio similarity"),
    ]

    for left_key, left_modality, right_key, right_modality, title in pairings:
        if left_modality in embeddings and right_modality in embeddings:
            matrix = compute_similarity(embeddings[left_modality], embeddings[right_modality])
            sections.append(matrix_to_markdown(title, labels[left_key], labels[right_key], matrix))
            report["similarities"][f"{left_key}_x_{right_key}"] = {
                "rows": labels[left_key],
                "cols": labels[right_key],
                "values": matrix.tolist(),
            }

    if not sections:
        raise gr.Error("Provide at least two supported modalities among text, images, and audio to compute similarities.")

    report_path = write_report(report)
    return "\n\n".join(sections), json.dumps(report, indent=2), report_path


CSS = """
#app-shell {
  margin: 0 auto;
  max-width: 1180px;
}
#run-button {
  min-height: 44px;
}
"""

with gr.Blocks(title="ImageBind Demo App", css=CSS) as demo:
    with gr.Column(elem_id="app-shell"):
        gr.Markdown(
            """
            # ImageBind Demo App
            Compare embeddings across text, images, and audio using the official Meta `ImageBind` model.

            - Enter one text prompt per line.
            - Upload one or more images and audio clips.
            - The app computes cosine-similarity matrices for each available cross-modal pairing.
            - First launch downloads pretrained weights into persistent cache volumes.
            """
        )

        with gr.Row():
            with gr.Column(scale=1):
                text_input = gr.Textbox(
                    label="Text prompts",
                    lines=10,
                    placeholder="A dog\nA car\nA violin concert",
                )
                image_input = gr.File(
                    label="Image files",
                    file_count="multiple",
                    file_types=["image"],
                    type="filepath",
                )
                audio_input = gr.File(
                    label="Audio files",
                    file_count="multiple",
                    file_types=["audio"],
                    type="filepath",
                )
                run_button = gr.Button("Run comparison", variant="primary", elem_id="run-button")
            with gr.Column(scale=1):
                markdown_output = gr.Markdown(label="Similarity report")
                json_output = gr.Code(label="Raw JSON report", language="json")
                saved_report = gr.File(label="Saved report")

    run_button.click(
        fn=run_demo,
        inputs=[text_input, image_input, audio_input],
        outputs=[markdown_output, json_output, saved_report],
        show_progress=True,
    )


demo.launch(server_name="0.0.0.0", server_port=PORT)
