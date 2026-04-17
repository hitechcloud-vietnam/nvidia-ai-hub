# F5 TTS App

Run the official F5-TTS Gradio interface locally on NVIDIA GPUs.

## What it provides

- Official upstream Gradio web app on port `7883`
- Prompt-audio-conditioned speech generation
- Multi-style and multi-speaker synthesis modes from upstream
- Persistent Hugging Face cache storage across restarts

## Default access

- UI: `http://localhost:7883`

## Notes

The first launch downloads the default F5-TTS checkpoints into the persistent Hugging Face cache directory.

Upstream documents both web UI and CLI workflows. This recipe targets the Gradio UI only.

## Risk notes

The upstream repository states that pretrained model checkpoints are released under `CC-BY-NC`. Reviewers should confirm that license fit matches the intended deployment before production use.
