import gc
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import gradio as gr
import torch
import whisperx

PORT = int(os.getenv("PORT", "7860"))
DEFAULT_MODEL = os.getenv("WHISPERX_MODEL", "large-v2")
DEFAULT_BATCH_SIZE = int(os.getenv("WHISPERX_BATCH_SIZE", "8"))
DEFAULT_COMPUTE_TYPE = os.getenv("WHISPERX_COMPUTE_TYPE", "float16")
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/data/output"))
HF_TOKEN_ENV = os.getenv("HF_TOKEN", "")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

if DEVICE == "cpu" and DEFAULT_COMPUTE_TYPE == "float16":
    DEFAULT_COMPUTE_TYPE = "int8"

ASR_MODELS = {}
ALIGN_MODELS = {}
ASR_LOCK = Lock()
ALIGN_LOCK = Lock()


def to_json_safe(value):
    if isinstance(value, dict):
        return {str(key): to_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [to_json_safe(item) for item in value]
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    return value


def get_asr_model(model_id: str, compute_type: str):
    key = (model_id, compute_type)
    with ASR_LOCK:
        if key not in ASR_MODELS:
            ASR_MODELS[key] = whisperx.load_model(
                model_id,
                DEVICE,
                compute_type=compute_type,
                download_root=os.getenv("HF_HOME"),
            )
    return ASR_MODELS[key]


def get_align_model(language_code: str):
    with ALIGN_LOCK:
        if language_code not in ALIGN_MODELS:
            ALIGN_MODELS[language_code] = whisperx.load_align_model(
                language_code=language_code,
                device=DEVICE,
            )
    return ALIGN_MODELS[language_code]


def srt_timestamp(value: float) -> str:
    total_ms = max(0, int(value * 1000))
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"


def build_transcript_text(segments: list[dict]) -> str:
    lines = []
    for segment in segments:
        speaker = segment.get("speaker")
        text = (segment.get("text") or "").strip()
        if not text:
            continue
        lines.append(f"[{speaker}] {text}" if speaker else text)
    return "\n".join(lines)


def write_srt(path: Path, segments: list[dict]) -> None:
    lines = []
    for index, segment in enumerate(segments, start=1):
        start = srt_timestamp(float(segment.get("start", 0.0)))
        end = srt_timestamp(float(segment.get("end", 0.0)))
        speaker = segment.get("speaker")
        text = (segment.get("text") or "").strip()
        if speaker:
            text = f"[{speaker}] {text}"
        lines.extend([str(index), f"{start} --> {end}", text, ""])
    path.write_text("\n".join(lines), encoding="utf-8")


def save_outputs(payload: dict) -> tuple[str, str, str]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    base = OUTPUT_DIR / f"whisperx-{stamp}"
    json_path = base.with_suffix(".json")
    txt_path = base.with_suffix(".txt")
    srt_path = base.with_suffix(".srt")
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    txt_path.write_text(build_transcript_text(payload.get("segments", [])), encoding="utf-8")
    write_srt(srt_path, payload.get("segments", []))
    return str(json_path), str(txt_path), str(srt_path)


def run_whisperx(
    audio_file,
    model_id,
    language,
    batch_size,
    compute_type,
    align_output,
    diarize,
    min_speakers,
    max_speakers,
    hf_token,
):
    if not audio_file:
        raise gr.Error("Please upload an audio or video file.")

    compute_type = compute_type or DEFAULT_COMPUTE_TYPE
    if DEVICE == "cpu" and compute_type == "float16":
        compute_type = "int8"

    diarization_token = (hf_token or HF_TOKEN_ENV).strip()
    if diarize and not diarization_token:
        raise gr.Error("Speaker diarization requires a Hugging Face token.")

    try:
        audio = whisperx.load_audio(audio_file)
        model = get_asr_model(model_id, compute_type)
        result = model.transcribe(
            audio,
            batch_size=int(batch_size),
            language=(language or None),
        )

        detected_language = result.get("language") or language or "unknown"
        if align_output:
            model_a, metadata = get_align_model(detected_language)
            result = whisperx.align(
                result["segments"],
                model_a,
                metadata,
                audio,
                DEVICE,
                return_char_alignments=False,
            )

        if diarize:
            diarize_kwargs = {}
            if int(min_speakers) > 0:
                diarize_kwargs["min_speakers"] = int(min_speakers)
            if int(max_speakers) > 0:
                diarize_kwargs["max_speakers"] = int(max_speakers)
            diarization_pipeline = whisperx.DiarizationPipeline(token=diarization_token, device=DEVICE)
            diarized_segments = diarization_pipeline(audio, **diarize_kwargs)
            result = whisperx.assign_word_speakers(diarized_segments, result)

        segments = to_json_safe(result.get("segments", []))
        transcript_text = build_transcript_text(segments)
        payload = {
            "model": model_id,
            "device": DEVICE,
            "compute_type": compute_type,
            "language": detected_language,
            "segment_count": len(segments),
            "aligned": bool(align_output),
            "diarized": bool(diarize),
            "segments": segments,
            "text": transcript_text,
        }
        json_path, txt_path, srt_path = save_outputs(payload)
        status = (
            f"Detected language: {detected_language}\n"
            f"Segments: {len(segments)}\n"
            f"Aligned: {'yes' if align_output else 'no'}\n"
            f"Diarized: {'yes' if diarize else 'no'}\n"
            f"Device: {DEVICE}\n"
            f"Compute type: {compute_type}"
        )
        return status, transcript_text, json_path, txt_path, srt_path
    except Exception as exc:  # pragma: no cover
        raise gr.Error(str(exc)) from exc
    finally:
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


with gr.Blocks(title="WhisperX Workstation") as demo:
    gr.Markdown(
        """
        # WhisperX Workstation
        Upload audio or video for batched transcription, alignment, optional speaker diarization, and export to JSON, TXT, and SRT.

        Speaker diarization needs a Hugging Face token with access to the required `pyannote` gated model.
        """
    )

    with gr.Row():
        with gr.Column(scale=1):
            audio_input = gr.File(label="Audio or video file", type="filepath")
            model_input = gr.Dropdown(
                label="WhisperX model",
                choices=["tiny", "base", "small", "medium", "large-v2", "large-v3"],
                value=DEFAULT_MODEL,
            )
            language_input = gr.Textbox(label="Language code (optional)", value="")
            batch_input = gr.Slider(label="Batch size", minimum=1, maximum=32, step=1, value=DEFAULT_BATCH_SIZE)
            compute_input = gr.Dropdown(
                label="Compute type",
                choices=["float16", "int8", "int8_float16", "float32"],
                value=DEFAULT_COMPUTE_TYPE,
            )
            align_input = gr.Checkbox(label="Run alignment", value=True)
            diarize_input = gr.Checkbox(label="Run speaker diarization", value=False)
            min_speakers_input = gr.Slider(label="Min speakers (0 = auto)", minimum=0, maximum=10, step=1, value=0)
            max_speakers_input = gr.Slider(label="Max speakers (0 = auto)", minimum=0, maximum=10, step=1, value=0)
            hf_token_input = gr.Textbox(label="HF token override (optional)", type="password", value="")
            run_button = gr.Button("Transcribe", variant="primary")
        with gr.Column(scale=1):
            status_output = gr.Textbox(label="Run summary", lines=8)
            transcript_output = gr.Textbox(label="Transcript", lines=18)
            json_output = gr.File(label="JSON export")
            txt_output = gr.File(label="TXT export")
            srt_output = gr.File(label="SRT export")

    run_button.click(
        fn=run_whisperx,
        inputs=[
            audio_input,
            model_input,
            language_input,
            batch_input,
            compute_input,
            align_input,
            diarize_input,
            min_speakers_input,
            max_speakers_input,
            hf_token_input,
        ],
        outputs=[status_output, transcript_output, json_output, txt_output, srt_output],
        show_progress=True,
    )


demo.launch(server_name="0.0.0.0", server_port=PORT)
