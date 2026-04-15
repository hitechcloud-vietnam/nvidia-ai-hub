# Open WebUI Pipelines

Official Docker-based recipe for the Open WebUI Pipelines service.

## What it provides

- Local pipeline server on port `9099`
- Persistent pipeline directory at `./data/pipelines`
- `.env`-driven API key and optional remote pipeline URL list
- Ready to pair with `Open WebUI` or other OpenAI-compatible clients that support Open WebUI Pipelines

## Default access

- API / docs: `http://localhost:9099/docs`

## Important security note

Open WebUI Pipelines can execute arbitrary Python code from installed or remote pipelines. Only load pipelines you trust, review any `PIPELINES_URLS` sources carefully, and avoid exposing the service publicly without additional access controls.

## Key environment variables

- `PIPELINES_PORT`: host port for the service
- `PIPELINES_API_KEY`: API key expected by clients such as Open WebUI
- `PIPELINES_URLS`: optional comma-separated list of remote pipeline sources to sync
- `PIPELINES_DIR`: in-container pipeline storage path
