# CosyVoice Studio

Run the official CosyVoice web demo locally on DGX Spark.

## What it provides

- Official Gradio web demo on port `7884`
- Multilingual TTS
- Zero-shot voice cloning from short prompt audio
- Cross-lingual synthesis
- Instruct-style speech control
- Persistent Hugging Face and ModelScope caches

## Default access

- UI: `http://localhost:7884`

## Notes

This recipe launches the upstream `webui.py` workflow and defaults to the `Fun-CosyVoice3-0.5B-2512` model.

The first launch can take a while because the selected checkpoint and supporting assets are downloaded into the mounted cache directories.

The upstream project documents optional `ttsfrd` resources for improved text normalization. This recipe does not preinstall those optional assets, so fallback normalization paths may be used.

## Risk notes

CosyVoice has a broad inference surface including zero-shot cloning and cross-lingual synthesis. Reviewers should treat uploaded prompt audio as sensitive data and verify model/license fit for production use.
