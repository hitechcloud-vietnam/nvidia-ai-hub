import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import gradio as gr
from huggingface_hub import login
from melo.api import TTS
import soundfile as sf
import torch

PORT = int(os.getenv("PORT", "7860"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

LANGUAGE_SPEAKERS = {
    "EN": ["EN-Default", "EN-US", "EN-BR", "EN_INDIA", "EN-AU"],
    "ES": ["ES"],
    "FR": ["FR"],
    "ZH": ["ZH"],
    "JP": ["JP"],
    "KR": ["KR"],
}

LANGUAGE_LABELS = {
    "EN": "English",
    "ES": "Spanish",
    "FR": "French",
    "ZH": "Chinese",
    "JP": "Japanese",
    "KR": "Korean",
}

MODELS = {}
MODEL_LOCK = Lock()

hf_token = os.getenv("HF_TOKEN") or os.getenv("hf")
if hf_token:
    try:
        login(token=hf_token, add_to_git_credential=False)
    except Exception as exc:  # pragma: no cover
        print(f"Failed to authenticate with Hugging Face token: {exc}")


def get_model(language_code: str) -> TTS:
    with MODEL_LOCK:
        if language_code not in MODELS:
            MODELS[language_code] = TTS(language=language_code, device=DEVICE)
    return MODELS[language_code]


def update_speakers(language_code: str):
    speakers = LANGUAGE_SPEAKERS[language_code]
    return gr.update(choices=speakers, value=speakers[0])


def save_output(text: str, language_code: str, speaker: str, speed: float) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    safe_speaker = speaker.replace("/", "-").replace(" ", "-")
    return OUTPUT_DIR / f"melotts-{language_code.lower()}-{safe_speaker}-x{speed:.2f}-{stamp}.wav"


def synthesize(text: str, language_code: str, speaker: str, speed: float):
    if not text or not text.strip():
        raise gr.Error("Text is required.")

    model = get_model(language_code)
    speaker_ids = model.hps.data.spk2id
    if speaker not in speaker_ids:
        raise gr.Error(f"Speaker '{speaker}' is not available for {language_code}.")

    output_path = save_output(text, language_code, speaker, float(speed))
    model.tts_to_file(text.strip(), speaker_ids[speaker], str(output_path), speed=float(speed))
    audio_data, sample_rate = sf.read(output_path)
    summary = (
        f"Language: {LANGUAGE_LABELS[language_code]}\n"
        f"Speaker: {speaker}\n"
        f"Speed: {float(speed):.2f}\n"
        f"Device: {DEVICE}"
    )
    return (sample_rate, audio_data), str(output_path), summary


with gr.Blocks(title="MeloTTS Studio") as demo:
    gr.Markdown(
        """
        # MeloTTS Studio
        Generate multilingual speech with MeloTTS using English accents plus Chinese, Japanese, Korean, Spanish, and French voices.
        """
    )

    with gr.Row():
        with gr.Column(scale=1):
            text_input = gr.Textbox(label="Speech text", lines=6, placeholder="Enter the text to synthesize")
            language_input = gr.Dropdown(
                label="Language",
                choices=list(LANGUAGE_SPEAKERS.keys()),
                value="EN",
            )
            speaker_input = gr.Dropdown(
                label="Speaker",
                choices=LANGUAGE_SPEAKERS["EN"],
                value=LANGUAGE_SPEAKERS["EN"][0],
            )
            speed_input = gr.Slider(label="Speed", minimum=0.5, maximum=2.0, step=0.05, value=1.0)
            run_button = gr.Button("Generate speech", variant="primary")
        with gr.Column(scale=1):
            audio_output = gr.Audio(label="Generated audio")
            file_output = gr.File(label="Saved WAV")
            summary_output = gr.Textbox(label="Run summary", lines=6)

    language_input.change(fn=update_speakers, inputs=[language_input], outputs=[speaker_input])
    run_button.click(
        fn=synthesize,
        inputs=[text_input, language_input, speaker_input, speed_input],
        outputs=[audio_output, file_output, summary_output],
        show_progress=True,
    )


demo.launch(server_name="0.0.0.0", server_port=PORT)
