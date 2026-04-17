import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import gradio as gr
import numpy as np
import torch
from PIL import Image, ImageColor, ImageDraw, ImageOps
from segment_anything import SamAutomaticMaskGenerator, SamPredictor, sam_model_registry

PORT = int(os.getenv("PORT", "7860"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
CHECKPOINT_DIR = Path(os.getenv("CHECKPOINT_DIR", "/data/checkpoints"))
SAM_CHECKPOINT_FILE = os.getenv("SAM_CHECKPOINT_FILE", "sam_vit_h_4b8939.pth")
SAM_MODEL_TYPE = os.getenv("SAM_MODEL_TYPE", "vit_h")
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

MODEL = None
PREDICTOR = None
MASK_GENERATOR = None
MODEL_LOCK = Lock()


def get_components():
    global MODEL, PREDICTOR, MASK_GENERATOR

    with MODEL_LOCK:
        if MODEL is None or PREDICTOR is None or MASK_GENERATOR is None:
            checkpoint_path = CHECKPOINT_DIR / SAM_CHECKPOINT_FILE
            model = sam_model_registry[SAM_MODEL_TYPE](checkpoint=str(checkpoint_path))
            model.to(device=DEVICE)
            predictor = SamPredictor(model)
            mask_generator = SamAutomaticMaskGenerator(model)
            MODEL = model
            PREDICTOR = predictor
            MASK_GENERATOR = mask_generator

    return PREDICTOR, MASK_GENERATOR


def normalize_image(image):
    if image is None:
        raise gr.Error("Please upload an image.")
    if isinstance(image, Image.Image):
        return ImageOps.exif_transpose(image).convert("RGB")
    if isinstance(image, str):
        with Image.open(image) as opened:
            return ImageOps.exif_transpose(opened).convert("RGB")
    raise gr.Error("Unsupported image input.")


def clamp_point(value, upper_bound):
    return max(0, min(int(value), upper_bound - 1))


def build_overlay(image, masks):
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    colors = [
        "#ff4d4f",
        "#40a9ff",
        "#73d13d",
        "#faad14",
        "#9254de",
        "#13c2c2",
    ]

    for idx, mask in enumerate(masks):
        segmentation = mask["segmentation"] if isinstance(mask, dict) else mask
        color = ImageColor.getrgb(colors[idx % len(colors)])
        mask_array = np.asarray(segmentation, dtype=bool)
        if mask_array.ndim != 2:
            continue
        tint = np.zeros((mask_array.shape[0], mask_array.shape[1], 4), dtype=np.uint8)
        tint[mask_array] = (*color, 90)
        tint_image = Image.fromarray(tint, mode="RGBA")
        overlay = Image.alpha_composite(overlay, tint_image)

        if isinstance(mask, dict):
            bbox = mask.get("bbox")
            if bbox and len(bbox) == 4:
                x, y, w, h = bbox
                draw.rectangle((x, y, x + w, y + h), outline=color + (255,), width=2)

    return Image.alpha_composite(base, overlay).convert("RGB")


def serialize_masks(masks):
    serialized = []
    for index, mask in enumerate(masks):
        entry = {
            "index": index,
            "area": int(mask.get("area", 0)),
            "bbox": [float(v) for v in mask.get("bbox", [])],
            "predicted_iou": float(mask.get("predicted_iou", 0.0)),
            "stability_score": float(mask.get("stability_score", 0.0)),
            "crop_box": [float(v) for v in mask.get("crop_box", [])],
        }
        serialized.append(entry)
    return serialized


def save_output(image, metadata, suffix):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    image_path = OUTPUT_DIR / f"segment-anything-{suffix}-{stamp}.png"
    json_path = OUTPUT_DIR / f"segment-anything-{suffix}-{stamp}.json"
    image.save(image_path)
    json_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return str(image_path), str(json_path)


def run_point_prompt(image, x_coord, y_coord):
    pil_image = normalize_image(image)
    np_image = np.array(pil_image)
    predictor, _ = get_components()
    predictor.set_image(np_image)

    x = clamp_point(x_coord, pil_image.width)
    y = clamp_point(y_coord, pil_image.height)

    masks, scores, logits = predictor.predict(
        point_coords=np.array([[x, y]]),
        point_labels=np.array([1]),
        multimask_output=True,
    )

    mask_entries = []
    for idx, (mask, score) in enumerate(zip(masks, scores)):
        ys, xs = np.where(mask)
        if xs.size == 0 or ys.size == 0:
            bbox = [0, 0, 0, 0]
            area = 0
        else:
            x1, x2 = xs.min(), xs.max()
            y1, y2 = ys.min(), ys.max()
            bbox = [int(x1), int(y1), int(x2 - x1 + 1), int(y2 - y1 + 1)]
            area = int(mask.sum())
        mask_entries.append(
            {
                "segmentation": mask,
                "bbox": bbox,
                "area": area,
                "predicted_iou": float(score),
                "stability_score": float(score),
                "crop_box": [0, 0, pil_image.width, pil_image.height],
            }
        )

    overlay = build_overlay(pil_image, mask_entries)
    metadata = {
        "mode": "point-prompt",
        "point": [x, y],
        "device": DEVICE,
        "model_type": SAM_MODEL_TYPE,
        "masks": serialize_masks(mask_entries),
    }
    image_path, json_path = save_output(overlay, metadata, "point")
    return overlay, json.dumps(metadata, indent=2), image_path, json_path


def run_automatic_masks(image):
    pil_image = normalize_image(image)
    np_image = np.array(pil_image)
    _, mask_generator = get_components()
    masks = mask_generator.generate(np_image)
    top_masks = sorted(masks, key=lambda item: item.get("area", 0), reverse=True)[:12]
    overlay = build_overlay(pil_image, top_masks)
    metadata = {
        "mode": "automatic-mask-generation",
        "device": DEVICE,
        "model_type": SAM_MODEL_TYPE,
        "mask_count": len(masks),
        "returned_masks": len(top_masks),
        "masks": serialize_masks(top_masks),
    }
    image_path, json_path = save_output(overlay, metadata, "automatic")
    return overlay, json.dumps(metadata, indent=2), image_path, json_path


CSS = """
#app-shell {
  margin: 0 auto;
  max-width: 1180px;
}
#run-button, #auto-button {
  min-height: 44px;
}
"""

with gr.Blocks(title="Segment Anything Studio", css=CSS) as demo:
    with gr.Column(elem_id="app-shell"):
        gr.Markdown(
            """
            # Segment Anything Studio
            Run the official Meta Segment Anything Model locally for promptable segmentation and automatic mask generation.

            - Upload an image.
            - Use X/Y point coordinates for promptable segmentation, or run automatic mask generation.
            - Export the overlay image and JSON metadata for later inspection.
            """
        )

        with gr.Row():
            with gr.Column(scale=1):
                image_input = gr.Image(type="pil", label="Input image")
                x_input = gr.Number(label="Point X", value=128, precision=0)
                y_input = gr.Number(label="Point Y", value=128, precision=0)
                run_button = gr.Button("Run point prompt", variant="primary", elem_id="run-button")
                auto_button = gr.Button("Run automatic masks", elem_id="auto-button")
            with gr.Column(scale=1):
                image_output = gr.Image(type="pil", label="Mask overlay")
                json_output = gr.Code(label="Mask metadata", language="json")
                saved_image = gr.File(label="Saved overlay image")
                saved_json = gr.File(label="Saved metadata JSON")

    run_button.click(
        fn=run_point_prompt,
        inputs=[image_input, x_input, y_input],
        outputs=[image_output, json_output, saved_image, saved_json],
        show_progress=True,
    )
    auto_button.click(
        fn=run_automatic_masks,
        inputs=[image_input],
        outputs=[image_output, json_output, saved_image, saved_json],
        show_progress=True,
    )


demo.launch(server_name="0.0.0.0", server_port=PORT)
