# WhisperX Workstation

Local WhisperX transcription workstation for DGX Spark.

## What it provides

- Gradio UI on port `7881`
- Batched Whisper transcription
- Optional alignment for better timestamps
- Optional speaker diarization
- Export to `JSON`, `TXT`, and `SRT`
- Persistent Hugging Face cache and saved transcript outputs

## Important notes

- Diarization requires a Hugging Face token and gated model access for the `pyannote` speaker diarization model.
- Larger WhisperX models improve accuracy but use more GPU memory and disk.
- Alignment model availability varies by language.

## Default access

- UI: `http://localhost:7881`

## Outputs

Each run stores:

- structured JSON transcript
- plain text transcript
- subtitle-ready SRT file

under the persistent output directory mounted at `./data/output`.
