# RVC Voice Conversion

Run the official RVC training and inference WebUI locally on NVIDIA GPUs.

## What it provides

- Official RVC WebUI on port `7887`
- Single-file and batch voice conversion workflows
- Dataset preprocessing, feature extraction, model training, and index building
- UVR5 vocal separation, dereverb, and de-echo utilities
- Persistent storage for pretrained assets, trained checkpoints, logs, indexes, and exported audio

## Default access

- UI: `http://localhost:7887`

## Notes

The first launch downloads the upstream prerequisite assets into the mounted data path, including `hubert_base.pt`, the `assets/pretrained` bundles, the `assets/pretrained_v2` bundles, `uvr5_weights`, `vocals.onnx`, and `rmvpe.pt`.

The inference dropdown stays empty until you place compatible `.pth` checkpoints under `./data/assets/weights` or train a model inside the WebUI.

Training logs, generated indexes, and experiment folders persist under `./data/logs`. Converted audio defaults to `./data/opt` unless you choose a different output folder in the UI.

This container starts the official `infer-web.py` app with `--noautoopen` and binds it to `0.0.0.0` inside the container.

## License notes

- Upstream code is released under the `MIT` license
- Downloaded pretrained assets and any third-party checkpoints can carry separate terms; reviewers should confirm redistribution rights before publishing bundled models or voices

## Risk notes

The upstream WebUI states that the software is MIT licensed, the authors do not control how it is used, and users or distributors of exported voices assume full responsibility for those outputs.

Only use reference audio, training data, and exported voices when you have clear authorization and consent. Voice conversion and cloning workflows can create sensitive biometric and copyright risks.

Mounted folders can contain uploaded source audio, trained checkpoints, indexes, and generated outputs. Review retained data before sharing or archiving it.
