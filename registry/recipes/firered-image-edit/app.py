import math
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import gradio as gr
import numpy as np
import torch
from diffusers import QwenImageEditPlusPipeline
from huggingface_hub import login
from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
except ImportError:  # pragma: no cover
    register_heif_opener = None


if register_heif_opener is not None:
    register_heif_opener()

hf_token = os.getenv("HF_TOKEN") or os.getenv("hf")
if hf_token:
    try:
        login(token=hf_token, add_to_git_credential=False)
    except Exception as exc:  # pragma: no cover
        print(f"Failed to authenticate with Hugging Face token: {exc}")


MODEL_ID = os.getenv("MODEL_ID", "FireRedTeam/FireRed-Image-Edit-1.1")
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
PORT = int(os.getenv("PORT", "7860"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
TORCH_DTYPE = torch.bfloat16 if DEVICE == "cuda" else torch.float32
MAX_SEED = np.iinfo(np.int32).max
MAX_INPUT_IMAGES = 3
MAX_OUTPUT_IMAGES = 4
DEFAULT_TARGET_AREA = 1024 * 1024

PIPELINE = None
PIPELINE_LOCK = Lock()
LOADED_ADAPTERS = set()

ADAPTER_SPECS = {
    "Covercraft": {
        "repo": "FireRedTeam/FireRed-Image-Edit-LoRA-Zoo",
        "weights": "FireRed-Image-Edit-Covercraft.safetensors",
        "adapter_name": "covercraft",
    },
    "Lightning": {
        "repo": "FireRedTeam/FireRed-Image-Edit-LoRA-Zoo",
        "weights": "FireRed-Image-Edit-Lightning-8steps-v1.0.safetensors",
        "adapter_name": "lightning",
    },
    "Makeup": {
        "repo": "FireRedTeam/FireRed-Image-Edit-LoRA-Zoo",
        "weights": "FireRed-Image-Edit-Makeup.safetensors",
        "adapter_name": "makeup",
    },
}
LORA_OPTIONS = ["None"] + list(ADAPTER_SPECS.keys())


def get_pipeline():
    global PIPELINE

    with PIPELINE_LOCK:
        if PIPELINE is None:
            pipe = QwenImageEditPlusPipeline.from_pretrained(
                MODEL_ID,
                torch_dtype=TORCH_DTYPE,
            )
            pipe.set_progress_bar_config(disable=True)

            if hasattr(pipe, "enable_attention_slicing"):
                pipe.enable_attention_slicing()
            if hasattr(pipe, "enable_vae_slicing"):
                pipe.enable_vae_slicing()
            if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
                pipe.vae.enable_tiling()
            if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_slicing"):
                pipe.vae.enable_slicing()

            if DEVICE == "cuda" and os.getenv("ENABLE_CPU_OFFLOAD", "0") == "1":
                pipe.enable_model_cpu_offload()
            else:
                pipe = pipe.to(DEVICE)

            PIPELINE = pipe

    return PIPELINE


def limit_images(images):
    if images is None:
        return []

    if len(images) > MAX_INPUT_IMAGES:
        gr.Info(f"FireRed supports up to {MAX_INPUT_IMAGES} input images. Extra uploads were ignored.")
        return images[:MAX_INPUT_IMAGES]

    return images


def normalize_image(item):
    if isinstance(item, tuple):
        item = item[0]

    if isinstance(item, Image.Image):
        return ImageOps.exif_transpose(item).convert("RGB")

    if isinstance(item, str):
        with Image.open(item) as image:
            return ImageOps.exif_transpose(image).convert("RGB")

    raise gr.Error("Unsupported image input.")


def round_to_multiple(value, multiple=32):
    return max(multiple, int(round(value / multiple) * multiple))


def suggest_dimensions(images):
    images = limit_images(images)
    if not images:
        return images, 0, 0

    image = normalize_image(images[0])
    aspect_ratio = image.width / image.height
    width = math.sqrt(DEFAULT_TARGET_AREA * aspect_ratio)
    height = width / aspect_ratio
    width = round_to_multiple(width)
    height = round_to_multiple(height)
    return images, height, width


def set_active_lora(lora_name):
    pipe = get_pipeline()

    if lora_name == "None" or not lora_name:
        if LOADED_ADAPTERS:
            pipe.set_adapters([], adapter_weights=[])
        return

    spec = ADAPTER_SPECS.get(lora_name)
    if not spec:
        raise gr.Error(f"Unknown LoRA selection: {lora_name}")

    adapter_name = spec["adapter_name"]
    if adapter_name not in LOADED_ADAPTERS:
        pipe.load_lora_weights(
            spec["repo"],
            weight_name=spec["weights"],
            adapter_name=adapter_name,
        )
        LOADED_ADAPTERS.add(adapter_name)

    pipe.set_adapters([adapter_name], adapter_weights=[1.0])


def save_outputs(images, seed):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    saved_paths = []

    for index, image in enumerate(images, start=1):
        path = OUTPUT_DIR / f"firered-image-edit-{stamp}-seed{seed}-{index}.png"
        image.save(path)
        saved_paths.append(str(path))

    return saved_paths


def edit_images(
    input_images,
    prompt,
    lora_choice,
    seed,
    randomize_seed,
    true_cfg_scale,
    num_inference_steps,
    height,
    width,
    num_images_per_prompt,
    progress=gr.Progress(track_tqdm=True),
):
    del progress

    if not prompt or not prompt.strip():
        raise gr.Error("Edit prompt is required.")

    input_images = limit_images(input_images)
    if not input_images:
        raise gr.Error("Upload at least one image.")

    pil_images = [normalize_image(item) for item in input_images]

    if randomize_seed:
        seed = random.randint(0, MAX_SEED)

    requested_outputs = max(1, min(int(num_images_per_prompt), MAX_OUTPUT_IMAGES))
    generator = torch.Generator(device=DEVICE).manual_seed(int(seed))

    if int(height) == 0:
        height = None
    else:
        height = int(height)

    if int(width) == 0:
        width = None
    else:
        width = int(width)

    set_active_lora(lora_choice)
    pipe = get_pipeline()

    result = pipe(
        image=pil_images,
        prompt=prompt.strip(),
        negative_prompt=" ",
        guidance_scale=1.0,
        true_cfg_scale=float(true_cfg_scale),
        num_inference_steps=int(num_inference_steps),
        num_images_per_prompt=requested_outputs,
        generator=generator,
        height=height,
        width=width,
    )

    output_images = result.images
    saved_paths = save_outputs(output_images, int(seed))
    return output_images, saved_paths, int(seed)


def on_lora_change(lora_name):
    if lora_name == "Lightning":
        return (
            gr.update(value=8, interactive=False),
            gr.update(value=1.0, interactive=False),
            gr.update(value=0, interactive=True),
            gr.update(value=False, interactive=False),
        )

    return (
        gr.update(value=30, interactive=True),
        gr.update(value=4.0, interactive=True),
        gr.update(value=42, interactive=True),
        gr.update(value=True, interactive=True),
    )


CSS = """
#app-shell {
  margin: 0 auto;
  max-width: 1240px;
}
#run-button {
  min-height: 44px;
}
"""


with gr.Blocks(title="FireRed Image Edit 1.1", css=CSS) as demo:
    with gr.Column(elem_id="app-shell"):
        gr.Markdown(
            """
            # FireRed Image Edit 1.1
            General-purpose image editing with optional FireRed LoRAs for makeup, stylized text, and faster Lightning sampling.

            First startup builds the container locally and then downloads model weights into a persistent cache volume.
            """
        )

        with gr.Row():
            with gr.Column(scale=1):
                input_images = gr.Gallery(
                    label="Input Images",
                    type="pil",
                    interactive=True,
                    height=360,
                    columns=3,
                    object_fit="contain",
                )
            with gr.Column(scale=1):
                output_images = gr.Gallery(
                    label="Output Images",
                    type="pil",
                    height=360,
                    columns=2,
                    object_fit="contain",
                )

        prompt = gr.Textbox(
            label="Edit Prompt",
            lines=4,
            placeholder="Example: Replace the background with a neon-lit rainy street, keep the subject identity and pose unchanged, add a cinematic blue-red color palette.",
        )

        with gr.Row(equal_height=True):
            lora_choice = gr.Dropdown(
                label="LoRA",
                choices=LORA_OPTIONS,
                value="None",
            )
            run_button = gr.Button("Edit Image", variant="primary", elem_id="run-button")

        with gr.Accordion("Advanced Settings", open=True):
            with gr.Row():
                seed = gr.Slider(label="Seed", minimum=0, maximum=MAX_SEED, step=1, value=42)
                randomize_seed = gr.Checkbox(label="Randomize Seed", value=True)
            with gr.Row():
                true_cfg_scale = gr.Slider(
                    label="True CFG Scale",
                    minimum=1.0,
                    maximum=10.0,
                    step=0.1,
                    value=4.0,
                )
                num_inference_steps = gr.Slider(
                    label="Inference Steps",
                    minimum=1,
                    maximum=40,
                    step=1,
                    value=30,
                )
            with gr.Row():
                height = gr.Slider(label="Height (0 = auto)", minimum=0, maximum=2048, step=32, value=0)
                width = gr.Slider(label="Width (0 = auto)", minimum=0, maximum=2048, step=32, value=0)
            num_images_per_prompt = gr.Slider(
                label="Number of Outputs",
                minimum=1,
                maximum=MAX_OUTPUT_IMAGES,
                step=1,
                value=1,
            )

        saved_files = gr.File(label="Download Images", file_count="multiple")
        final_seed = gr.Number(label="Final Seed", precision=0)

    run_button.click(
        fn=edit_images,
        inputs=[
            input_images,
            prompt,
            lora_choice,
            seed,
            randomize_seed,
            true_cfg_scale,
            num_inference_steps,
            height,
            width,
            num_images_per_prompt,
        ],
        outputs=[output_images, saved_files, final_seed],
    )

    prompt.submit(
        fn=edit_images,
        inputs=[
            input_images,
            prompt,
            lora_choice,
            seed,
            randomize_seed,
            true_cfg_scale,
            num_inference_steps,
            height,
            width,
            num_images_per_prompt,
        ],
        outputs=[output_images, saved_files, final_seed],
    )

    lora_choice.change(
        fn=on_lora_change,
        inputs=[lora_choice],
        outputs=[num_inference_steps, true_cfg_scale, seed, randomize_seed],
    )

    input_images.upload(
        fn=suggest_dimensions,
        inputs=[input_images],
        outputs=[input_images, height, width],
    )


if __name__ == "__main__":
    get_pipeline()
    demo.queue(default_concurrency_limit=1, max_size=16).launch(
        server_name="0.0.0.0",
        server_port=PORT,
        share=False,
        show_error=True,
        allowed_paths=[str(OUTPUT_DIR)],
    )
