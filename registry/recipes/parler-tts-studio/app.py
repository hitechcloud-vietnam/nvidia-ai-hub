import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import gradio as gr
from huggingface_hub import login
from parler_tts import ParlerTTSForConditionalGeneration
import soundfile as sf
import torch
from transformers import AutoTokenizer

PORT = int(os.getenv("PORT", "7860"))
MODEL_ID = os.getenv("PARLER_MODEL", "parler-tts/parler-tts-mini-v1")
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
TORCH_DTYPE = torch.float16 if torch.cuda.is_available() else torch.float32

SPEAKER_PRESETS = {
    "Laura": "Laura's voice is warm, clear, and very close-mic with calm pacing and very clear audio.",
    "Jon": "Jon's voice is monotone yet slightly fast in delivery, with a very close recording that almost has no background noise.",
    "Lea": "Lea speaks with a bright, expressive tone, medium pace, and very clear audio with almost no reverb.",
    "Gary": "Gary has a confident radio-style voice, deep tone, steady pacing, and studio-clean recording quality.",
    "Emily": "Emily has a friendly narration voice with gentle expressiveness, moderate pace, and very clear audio.",
}

MODEL = None
TOKENIZER = None
MODEL_LOCK = Lock()

hf_token = os.getenv("HF_TOKEN") or os.getenv("hf")
if hf_token:
    try:
        login(token=hf_token, add_to_git_credential=False)
    except Exception as exc:  # pragma: no cover
        print(f"Failed to authenticate with Hugging Face token: {exc}")


def get_components():
    global MODEL, TOKENIZER
    with MODEL_LOCK:
        if MODEL is None or TOKENIZER is None:
            MODEL = ParlerTTSForConditionalGeneration.from_pretrained(
                MODEL_ID,
                torch_dtype=TORCH_DTYPE,
            ).to(DEVICE)
            MODEL.eval()
            TOKENIZER = AutoTokenizer.from_pretrained(MODEL_ID)
    return MODEL, TOKENIZER


def build_description(preset_name: str, custom_description: str) -> str:
    description = (custom_description or "").strip()
    if description:
        return description
    return SPEAKER_PRESETS.get(preset_name, next(iter(SPEAKER_PRESETS.values())))


def save_audio(audio_array, sample_rate: int) -> str:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = OUTPUT_DIR / f"parler-tts-{stamp}.wav"
    sf.write(path, audio_array, sample_rate)
    return str(path)


def synthesize(prompt: str, preset_name: str, custom_description: str):
    if not prompt or not prompt.strip():
        raise gr.Error("Prompt text is required.")

    description = build_description(preset_name, custom_description)
    model, tokenizer = get_components()
    input_ids = tokenizer(description, return_tensors="pt").input_ids.to(DEVICE)
    prompt_input_ids = tokenizer(prompt.strip(), return_tensors="pt").input_ids.to(DEVICE)

    with torch.inference_mode():
        generation = model.generate(input_ids=input_ids, prompt_input_ids=prompt_input_ids)

    audio_array = generation.cpu().numpy().squeeze()
    saved_path = save_audio(audio_array, model.config.sampling_rate)
    return (model.config.sampling_rate, audio_array), saved_path, description


with gr.Blocks(title="Parler TTS Studio") as demo:
    gr.Markdown(
        """
        # Parler TTS Studio
        Generate high-quality speech from a text prompt plus a natural-language voice description. Use a preset speaker style or provide your own custom description.
        """
    )

    with gr.Row():
        with gr.Column(scale=1):
            prompt_input = gr.Textbox(label="Speech text", lines=6, placeholder="Enter the text to speak")
            preset_input = gr.Dropdown(label="Speaker preset", choices=list(SPEAKER_PRESETS.keys()), value="Laura")
            description_input = gr.Textbox(
                label="Custom voice description (optional)",
                lines=4,
                placeholder="Example: A female speaker delivers a slightly expressive and animated speech with a moderate speed and pitch. The recording is very clear and close-mic.",
            )
            run_button = gr.Button("Generate speech", variant="primary")
        with gr.Column(scale=1):
            audio_output = gr.Audio(label="Generated audio")
            file_output = gr.File(label="Saved WAV")
            description_output = gr.Textbox(label="Voice description used", lines=4)

    run_button.click(
        fn=synthesize,
        inputs=[prompt_input, preset_input, description_input],
        outputs=[audio_output, file_output, description_output],
        show_progress=True,
    )


demo.launch(server_name="0.0.0.0", server_port=PORT)
