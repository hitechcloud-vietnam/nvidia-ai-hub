# MeloTTS Studio

Local MeloTTS speech generation studio for NVIDIA GPUs.

## What it provides

- Gradio UI on port `7885`
- English multi-accent voices
- Chinese, Japanese, Korean, Spanish, and French voices
- Adjustable speaking speed
- Persistent cache and exported WAV files

## Default access

- UI: `http://localhost:7885`

## Notes

MeloTTS is light enough for CPU real-time inference in some cases, but this recipe keeps GPU support enabled when available.

The first run for a language downloads the corresponding MeloTTS assets into the mounted cache path.
