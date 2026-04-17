# Parler TTS Studio

Local Parler-TTS voice generation studio for NVIDIA GPUs.

## What it provides

- Gradio UI on port `7882`
- Promptable text-to-speech generation
- Built-in speaker-style presets
- Custom freeform voice descriptions
- Persistent Hugging Face cache and WAV export directory

## Default access

- UI: `http://localhost:7882`

## How it works

Parler-TTS uses two text inputs:

- the speech content to say
- a natural-language description of the speaker style, recording quality, and delivery

This recipe lets you start with curated presets or override them with your own custom voice description.

## Notes

The first launch downloads the configured Parler-TTS checkpoint into the persistent cache directory. Larger checkpoints improve quality but increase memory use and startup time.
