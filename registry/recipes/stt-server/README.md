# STT Server

Local Faster-Whisper API server for DGX Spark.

## What it provides

- FastAPI speech-to-text endpoint on port `7880`
- OpenAPI docs at `http://localhost:7880/docs`
- Word timestamps, VAD filtering, and translation mode
- Persistent Hugging Face / model cache and JSON transcript export directory

## Default endpoints

- `GET /health`
- `POST /transcribe`
- `GET /docs`

## Request fields

`POST /transcribe` accepts multipart form data:

- `audio`: uploaded audio or video file
- `task`: `transcribe` or `translate`
- `language`: optional language code
- `beam_size`: decoding beam size
- `word_timestamps`: include per-word timings
- `vad_filter`: enable VAD preprocessing
- `initial_prompt`: optional domain hint

## Example response

Returns JSON with:

- detected language
- confidence
- full transcript text
- per-segment timings
- optional per-word timings
- saved JSON path under `/data/output`

## Notes

The first request downloads the configured Faster-Whisper model into the persistent cache directory. Larger models improve accuracy but increase startup time, GPU memory use, and disk consumption.
