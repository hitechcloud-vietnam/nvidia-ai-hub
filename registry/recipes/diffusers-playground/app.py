import os
import random
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import gradio as gr
import numpy as np
import torch
from diffusers import (
    AutoPipelineForImage2Image,
    AutoPipelineForInpainting,
    AutoPipelineForText2Image,
)
from huggingface_hub import login
from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
except ImportError:  # pragma: no cover
    register_heif_opener = None

if register_heif_opener is not None:
    register_heif_opener()

PORT = int(os.getenv("PORT", "7860"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
TXT2IMG_MODEL_ID = os.getenv("TXT2IMG_MODEL_ID", "stable-diffusion-v1-5/stable-diffusion-v1-5")
IMG2IMG_MODEL_ID = os.getenv("IMG2IMG_MODEL_ID", TXT2IMG_MODEL_ID)
INPAINT_MODEL_ID = os.getenv("INPAINT_MODEL_ID", "stable-diffusion-v1-5/stable-diffusion-inpainting")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
TORCH_DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32
MAX_SEED = np.iinfo(np.int32).max

PIPELINES = {}
PIPELINE_LOCK = Lock()

hf_token = os.getenv("HF_TOKEN") or os.getenv("hf")
if hf_token:
    try:
        login(token=hf_token, add_to_git_credential=False)
    except Exception as exc:  # pragma: no cover
        print(f"Failed to authenticate with Hugging Face token: {exc}")


def configure_pipeline(pipe):
    if hasattr(pipe, "set_progress_bar_config"):
        pipe.set_progress_bar_config(disable=True)
    if hasattr(pipe, "enable_attention_slicing"):
        pipe.enable_attention_slicing()
    if hasattr(pipe, "enable_vae_slicing"):
        pipe.enable_vae_slicing()
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_slicing"):
        pipe.vae.enable_slicing()
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    if DEVICE == "cuda" and os.getenv("ENABLE_CPU_OFFLOAD", "0") == "1":
        pipe.enable_model_cpu_offload()
    else:
        pipe = pipe.to(DEVICE)

    return pipe


def get_pipeline(kind):
    with PIPELINE_LOCK:
        if kind not in PIPELINES:
            if kind == "txt2img":
                pipe = AutoPipelineForText2Image.from_pretrained(
                    TXT2IMG_MODEL_ID,
                    torch_dtype=TORCH_DTYPE,
                )
            elif kind == "img2img":
                pipe = AutoPipelineForImage2Image.from_pretrained(
                    IMG2IMG_MODEL_ID,
                    torch_dtype=TORCH_DTYPE,
                )
            elif kind == "inpaint":
                pipe = AutoPipelineForInpainting.from_pretrained(
                    INPAINT_MODEL_ID,
                    torch_dtype=TORCH_DTYPE,
                )
            else:
                raise gr.Error(f"Unsupported pipeline kind: {kind}")

            PIPELINES[kind] = configure_pipeline(pipe)

    return PIPELINES[kind]


def normalize_image(image):
    if image is None:
        raise gr.Error("Please provide an image.")

    if isinstance(image, dict):
        image = image.get("background") or image.get("image")

    if isinstance(image, Image.Image):
        return ImageOps.exif_transpose(image).convert("RGB")

    if isinstance(image, str):
        with Image.open(image) as opened:
            return ImageOps.exif_transpose(opened).convert("RGB")

    raise gr.Error("Unsupported image input.")


def normalize_mask(mask):
    if mask is None:
        raise gr.Error("Please provide a mask for inpainting.")

    if isinstance(mask, dict):
        mask = mask.get("layers", [None])[0] or mask.get("mask") or mask.get("image")

    if isinstance(mask, Image.Image):
        return ImageOps.exif_transpose(mask).convert("L")

    if isinstance(mask, str):
        with Image.open(mask) as opened:
            return ImageOps.exif_transpose(opened).convert("L")

    raise gr.Error("Unsupported mask input.")


def save_output(image, prefix, seed):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = OUTPUT_DIR / f"{prefix}-{stamp}-seed{seed}.png"
    image.save(path)
    return str(path)


def build_generator(seed, randomize_seed):
    if randomize_seed:
        seed = random.randint(0, MAX_SEED)
    generator = torch.Generator(device=DEVICE).manual_seed(int(seed))
    return int(seed), generator


def generate_text_to_image(prompt, negative_prompt, steps, guidance, height, width, seed, randomize_seed):
    if not prompt or not prompt.strip():
        raise gr.Error("Prompt is required.")

    final_seed, generator = build_generator(seed, randomize_seed)
    pipe = get_pipeline("txt2img")
    result = pipe(
        prompt=prompt.strip(),
        negative_prompt=(negative_prompt or None),
        num_inference_steps=int(steps),
        guidance_scale=float(guidance),
        height=int(height),
        width=int(width),
        generator=generator,
    )
    image = result.images[0]
    saved = save_output(image, "diffusers-playground-txt2img", final_seed)
    return image, saved, final_seed


def generate_image_to_image(image, prompt, negative_prompt, strength, steps, guidance, seed, randomize_seed):
    if not prompt or not prompt.strip():
        raise gr.Error("Prompt is required.")

    init_image = normalize_image(image)
    final_seed, generator = build_generator(seed, randomize_seed)
    pipe = get_pipeline("img2img")
    result = pipe(
        prompt=prompt.strip(),
        image=init_image,
        negative_prompt=(negative_prompt or None),
        strength=float(strength),
        num_inference_steps=int(steps),
        guidance_scale=float(guidance),
        generator=generator,
    )
    output = result.images[0]
    saved = save_output(output, "diffusers-playground-img2img", final_seed)
    return output, saved, final_seed


def generate_inpaint(image, mask, prompt, negative_prompt, steps, guidance, seed, randomize_seed):
    if not prompt or not prompt.strip():
        raise gr.Error("Prompt is required.")

    init_image = normalize_image(image)
    mask_image = normalize_mask(mask).resize(init_image.size)
    final_seed, generator = build_generator(seed, randomize_seed)
    pipe = get_pipeline("inpaint")
    result = pipe(
        prompt=prompt.strip(),
        image=init_image,
        mask_image=mask_image,
        negative_prompt=(negative_prompt or None),
        num_inference_steps=int(steps),
        guidance_scale=float(guidance),
        generator=generator,
    )
    output = result.images[0]
    saved = save_output(output, "diffusers-playground-inpaint", final_seed)
    return output, saved, final_seed


CSS = """
#app-shell {
  margin: 0 auto;
  max-width: 1240px;
}
.generate-button {
  min-height: 44px;
}
"""


with gr.Blocks(title="Diffusers Playground", css=CSS) as demo:
    with gr.Column(elem_id="app-shell"):
        gr.Markdown(
            """
            # Diffusers Playground
            Local playground built on the official `diffusers` library with text-to-image, image-to-image, and inpainting workflows.

            First launch downloads the selected pipelines into a persistent Hugging Face cache volume.
            """
        )

        with gr.Tabs():
            with gr.TabItem("Text to Image"):
                txt_prompt = gr.Textbox(label="Prompt", lines=4)
                txt_negative = gr.Textbox(label="Negative Prompt", lines=2)
                with gr.Row():
                    txt_steps = gr.Slider(label="Inference Steps", minimum=1, maximum=60, step=1, value=30)
                    txt_guidance = gr.Slider(label="Guidance Scale", minimum=1.0, maximum=15.0, step=0.1, value=7.5)
                with gr.Row():
                    txt_height = gr.Slider(label="Height", minimum=256, maximum=1024, step=64, value=512)
                    txt_width = gr.Slider(label="Width", minimum=256, maximum=1024, step=64, value=512)
                with gr.Row():
                    txt_seed = gr.Slider(label="Seed", minimum=0, maximum=MAX_SEED, step=1, value=42)
                    txt_random = gr.Checkbox(label="Randomize Seed", value=True)
                txt_run = gr.Button("Generate", variant="primary", elem_classes=["generate-button"])
                txt_image = gr.Image(type="pil", label="Output image")
                txt_file = gr.File(label="Saved output")
                txt_final_seed = gr.Number(label="Final Seed", precision=0)

            with gr.TabItem("Image to Image"):
                img_input = gr.Image(type="pil", label="Input image")
                img_prompt = gr.Textbox(label="Prompt", lines=4)
                img_negative = gr.Textbox(label="Negative Prompt", lines=2)
                with gr.Row():
                    img_strength = gr.Slider(label="Strength", minimum=0.1, maximum=1.0, step=0.05, value=0.6)
                    img_steps = gr.Slider(label="Inference Steps", minimum=1, maximum=60, step=1, value=30)
                    img_guidance = gr.Slider(label="Guidance Scale", minimum=1.0, maximum=15.0, step=0.1, value=7.5)
                with gr.Row():
                    img_seed = gr.Slider(label="Seed", minimum=0, maximum=MAX_SEED, step=1, value=42)
                    img_random = gr.Checkbox(label="Randomize Seed", value=True)
                img_run = gr.Button("Transform", variant="primary", elem_classes=["generate-button"])
                img_output = gr.Image(type="pil", label="Output image")
                img_file = gr.File(label="Saved output")
                img_final_seed = gr.Number(label="Final Seed", precision=0)

            with gr.TabItem("Inpainting"):
                inpaint_image = gr.Image(type="pil", label="Base image")
                inpaint_mask = gr.Image(type="pil", label="Mask image", image_mode="L")
                inpaint_prompt = gr.Textbox(label="Prompt", lines=4)
                inpaint_negative = gr.Textbox(label="Negative Prompt", lines=2)
                with gr.Row():
                    inpaint_steps = gr.Slider(label="Inference Steps", minimum=1, maximum=60, step=1, value=30)
                    inpaint_guidance = gr.Slider(label="Guidance Scale", minimum=1.0, maximum=15.0, step=0.1, value=7.5)
                with gr.Row():
                    inpaint_seed = gr.Slider(label="Seed", minimum=0, maximum=MAX_SEED, step=1, value=42)
                    inpaint_random = gr.Checkbox(label="Randomize Seed", value=True)
                inpaint_run = gr.Button("Inpaint", variant="primary", elem_classes=["generate-button"])
                inpaint_output = gr.Image(type="pil", label="Output image")
                inpaint_file = gr.File(label="Saved output")
                inpaint_final_seed = gr.Number(label="Final Seed", precision=0)

    txt_run.click(
        fn=generate_text_to_image,
        inputs=[txt_prompt, txt_negative, txt_steps, txt_guidance, txt_height, txt_width, txt_seed, txt_random],
        outputs=[txt_image, txt_file, txt_final_seed],
        show_progress=True,
    )
    img_run.click(
        fn=generate_image_to_image,
        inputs=[img_input, img_prompt, img_negative, img_strength, img_steps, img_guidance, img_seed, img_random],
        outputs=[img_output, img_file, img_final_seed],
        show_progress=True,
    )
    inpaint_run.click(
        fn=generate_inpaint,
        inputs=[inpaint_image, inpaint_mask, inpaint_prompt, inpaint_negative, inpaint_steps, inpaint_guidance, inpaint_seed, inpaint_random],
        outputs=[inpaint_output, inpaint_file, inpaint_final_seed],
        show_progress=True,
    )


demo.launch(server_name="0.0.0.0", server_port=PORT)
