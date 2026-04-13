# NemoClaw on DGX Spark

This recipe is tuned for a DGX Spark-style local inference flow:

- local Ollama on the host
- `nemotron-3-super:120b` as the default model tag
- Telegram channel wiring enabled at image build time
- persisted NemoClaw/OpenClaw state under `registry/recipes/nemoclaw/data/`

## Before the first build

1. Make sure Ollama is running on the host.
2. Ensure containers can reach it at `http://host.openshell.internal:11434`.
3. On Linux, bind Ollama to `0.0.0.0:11434`, not only `127.0.0.1`.
4. Pull the model you plan to use, or update `NEMOCLAW_MODEL` in `.env` before building.

## Telegram notes

- `TELEGRAM_BOT_TOKEN` is resolved at runtime.
- `NEMOCLAW_MESSAGING_CHANNELS_B64` is baked into the image. The default value enables `telegram`.
- `NEMOCLAW_MESSAGING_ALLOWED_IDS_B64` is optional and expects base64-encoded JSON such as `{"telegram":["123456789"]}`.

If you change the baked messaging fields or the model route, rebuild the recipe.

## Token export

After first launch, the dashboard token is written to:

- `registry/recipes/nemoclaw/data/metadata/openclaw-token.txt`