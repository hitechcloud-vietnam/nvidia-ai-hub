# Spark AI Hub

**Your AI app store for NVIDIA DGX Spark.** Browse, install, and launch AI apps with one click.

![Spark AI Hub](Spark AI Hub.png)

## Overview

Spark AI Hub provides a web UI and API for managing curated AI application recipes on NVIDIA DGX Spark.

The project includes:

- A `FastAPI` backend for recipe, system, and container management
- A `React + Vite` frontend served as static files by the backend
- A Docker-based runtime model for AI applications in `registry/recipes`

## Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/spark-ai-hub/main/install.sh | bash
```

After installation, open:

- `http://localhost:9000`
- or `http://<your-spark-ip>:9000` from another device on the same network

Run the same command again to update.

## What the installer does

The installer is designed to provision both backend and frontend automatically.

It will:

1. Install `git` if missing
2. Install `python3`, `python3-venv`, and `pip` if missing
3. Install Docker Engine if missing
4. Install Node.js 22.x if the system version is not suitable for the frontend build
5. Clone or update the `spark-ai-hub` repository in `$HOME/spark-ai-hub`
6. Create a Python virtual environment in `.venv`
7. Install backend dependencies from `requirements.txt`
8. Install frontend dependencies from `frontend/package.json`
9. Build the production frontend into `frontend/dist`
10. Start the backend on port `9000`

Because the backend serves the built frontend from `frontend/dist`, the UI is available immediately after install.

## Features

- Browse a catalog of AI apps ready for DGX Spark
- Install any app with one click — no terminal needed
- Launch, stop, and monitor running apps from the dashboard
- Track GPU, RAM, disk, and temperature in real time

## Available apps

| App | What it does | GPU |
|-----|-------------|-----|
| Open WebUI + Ollama | Chat with local LLMs | Yes |
| vLLM (Qwen 3.5) | High-performance LLM inference (8 model sizes) | Yes |
| ComfyUI | Image & video generation workflows | Yes |
| FaceFusion | Face swap & enhancement | Yes |
| Hunyuan3D 2.1 | Image to 3D model generation | Yes |
| TRELLIS 2 | Text/image to 3D generation | Yes |
| LocalAI | OpenAI-compatible API server | Yes |
| AnythingLLM | RAG & AI agents | No |
| Flowise | Drag-and-drop LLM workflows | No |
| Langflow | Visual LLM app builder | No |

All apps run as Docker containers with ARM64 + CUDA support.

## Requirements

### Minimum

- NVIDIA DGX Spark
- Ubuntu/Debian-based Linux environment with `apt-get`
- Internet access during installation
- Permission to use `sudo` for package installation

### Installed automatically

- Git
- Python 3 + venv
- Docker Engine
- Node.js 22.x

## Manual operation

### Update an existing installation

Run the installer again:

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/spark-ai-hub/main/install.sh | bash
```

### Start manually from an existing clone

If the repository is already available locally:

```bash
./run.sh
```

`run.sh` now checks whether `frontend/dist` is missing or outdated. If needed, it rebuilds the UI automatically before starting the backend.

If the frontend must be rebuilt, ensure the machine has:

- `node` >= 22
- `npm`

### Default service URL

- UI: `http://localhost:9000`
- API root: `http://localhost:9000`

## Troubleshooting

### The page opens but has no styling or JavaScript

This usually means the frontend build was not generated. Re-run the installer so it rebuilds `frontend/dist`.

### Docker works only with sudo

The installer adds the current user to the `docker` group. Log out and log back in, or run:

```bash
newgrp docker
```

### `python3 -m venv .venv` fails

Ensure `python3-venv` is installed. The installer attempts to install it automatically.

### Frontend build fails because of Node.js version

The installer installs Node.js 22.x when the detected version is too old. Re-run the installer if the system Node version changed unexpectedly.

### `run.sh` exits with a frontend build requirement message

This means the checked-in or generated UI bundle is missing or stale, and the current machine does not have a compatible Node.js toolchain. Run `install.sh` to provision Node.js and rebuild the frontend.

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/spark-ai-hub/main/uninstall.sh | bash
```

Removes all Spark AI Hub containers, volumes, and files. Does not touch Docker itself.

## License

MIT
