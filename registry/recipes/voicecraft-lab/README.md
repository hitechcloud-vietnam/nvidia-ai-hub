# VoiceCraft Lab

Run the official VoiceCraft Gradio workflow locally on DGX Spark.

## What it provides

- Official VoiceCraft Gradio UI on port `7886`
- Zero-shot TTS from short prompt audio
- Speech editing with transcript and alignment controls
- Long TTS rerun workflow for sentence-by-sentence regeneration
- Persistent model, cache, and temporary working storage across restarts

## Default access

- UI: `http://localhost:7886`

## Notes

The first launch downloads VoiceCraft checkpoints, Encodec weights, Whisper or WhisperX assets, and alignment resources into the mounted cache paths.

Upstream recommends keeping the prompt reference short. In practice, a prompt end time around 3 to 6 seconds is usually enough, and total prompt plus generated audio should stay below about 16 to 17 seconds.

The upstream Gradio workflow notes that changing advanced parameters other than `sample_batch_size`, `stop_repetition`, and `seed` can trigger JSON warnings in some runs.

This recipe bakes Montreal Forced Aligner and the default English MFA resources into the container so the built-in alignment flow is available without extra setup.

## License notes

- Upstream code is released under `CC BY-NC-SA 4.0`
- Upstream model weights are released under `Coqui Public Model License 1.0.0`
- Reviewers should confirm that both licenses fit the intended deployment

## Risk notes

VoiceCraft supports convincing voice imitation and speech editing. Only use prompt audio and generated outputs with clear authorization and consent.

Uploaded audio, transcripts, and temporary alignment artifacts can contain sensitive data. Review mounted storage paths before sharing or retaining them.
