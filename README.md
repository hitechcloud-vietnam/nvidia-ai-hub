# Spark AI Hub

[![Contributing](https://img.shields.io/badge/Contributing-Guide-2ea44f?style=flat-square)](./CONTRIBUTING.md)

**Your AI app store for NVIDIA DGX Spark.** Browse, install, and launch AI apps with one click.

![Spark AI Hub](SparkDeck.png)

## Overview

Spark AI Hub provides a web UI and API for managing curated AI application recipes on NVIDIA DGX Spark.

The project includes:

- A `FastAPI` backend for recipe, system, and container management
- A `React + Vite` frontend served as static files by the backend
- A Docker-based runtime model for AI applications in `registry/recipes`

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for contribution workflow, development setup, recipe guidance, and pull request expectations.

## Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/spark-ai-hub/main/install.sh | bash
```

Install without starting the server:

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/spark-ai-hub/main/install.sh | bash -s -- --no-start
```

Install on a custom port:

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/spark-ai-hub/main/install.sh | bash -s -- --port 9010
```

Install on a custom host and port:

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/spark-ai-hub/main/install.sh | bash -s -- --host 127.0.0.1 --port 9010
```

### Windows install

From a local clone in PowerShell:

```powershell
.\install.ps1
```

Install without starting the server:

```powershell
.\install.ps1 -NoStart
```

Install on a custom port:

```powershell
.\install.ps1 -Port 9010
```

Install on a custom host and port:

```powershell
.\install.ps1 -Host 127.0.0.1 -Port 9010
```

Check the environment on Windows:

```powershell
.\check.ps1
```

Run the app on Windows:

```powershell
.\run.ps1
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

If `--no-start` or `-NoStart` is used, the installer completes all setup steps but skips launching the API server.

If `--port`, `--host`, `-Port`, or `-Host` is used during install, the chosen values are written into the shared root `.env` file.

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

Before starting, you can validate the machine state with:

```bash
./check.sh
```

On Windows PowerShell:

```powershell
.\check.ps1
```

`run.sh` now checks whether `frontend/dist` is missing or outdated. If needed, it rebuilds the UI automatically before starting the backend.

On Windows PowerShell, use:

```powershell
.\run.ps1
```

You can also start on a custom port for a single run:

```bash
./run.sh --port 9010
```

```powershell
.\run.ps1 -Port 9010
```

You can also override host and port for a single run:

```bash
./run.sh --host 127.0.0.1 --port 9010
```

```powershell
.\run.ps1 -Host 127.0.0.1 -Port 9010
```

If the frontend must be rebuilt, ensure the machine has:

- `node` >= 22
- `npm`

### Default service URL

- UI: `http://localhost:9000`
- API root: `http://localhost:9000`

## Windows notes

`install.ps1` is intended for Windows 11 or Windows Server environments with:

- `winget` available
- Docker Desktop support
- PowerShell 7 or Windows PowerShell 5.1+

The script will attempt to install:

- Git
- Python 3
- Node.js LTS
- Docker Desktop

It then creates `.venv`, installs backend/frontend dependencies, builds `frontend/dist`, and optionally starts the API server.

If Docker Desktop is installed but not running yet, the installer warns and continues. The UI can still start, but recipe lifecycle operations will need Docker to be running.

`check.ps1` and `run.ps1` provide Windows equivalents for environment validation and local startup.

`uninstall.ps1` provides a Windows-native cleanup flow.

## Shared configuration

The repository now includes a shared root `.env` local file format, with `.env.example` checked in as the template, used by:

- `daemon/config.py`
- `install.sh`
- `run.sh`
- `check.sh`
- `install.ps1`
- `run.ps1`
- `check.ps1`

Default values include:

- `SPARK_AI_HUB_HOST`
- `SPARK_AI_HUB_PORT`
- `SPARK_AI_HUB_NODE_MAJOR`
- `SPARK_AI_HUB_REGISTRY_PATH`
- `SPARK_AI_HUB_DATA_DIR`
- `SPARK_AI_HUB_DB_PATH`

To create a local configuration manually:

```bash
cp .env.example .env
```

or in PowerShell:

```powershell
Copy-Item .env.example .env
```

`install.sh` and `install.ps1` create `.env` from `.env.example` automatically when needed.

Update `.env` if you want to keep a custom default host, port, or path layout across runs.

## Troubleshooting

### The page opens but has no styling or JavaScript

This usually means the frontend build was not generated. Re-run the installer so it rebuilds `frontend/dist`.

You can also run `./check.sh` to confirm whether the frontend bundle is missing or stale.

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

### `check.sh` reports Docker daemon is not reachable

Start Docker Desktop or the Docker service, then re-run `./check.sh`. Spark AI Hub can start without Docker only in a limited UI/API state.

### `install.ps1` cannot install dependencies automatically

This usually means `winget` is unavailable or blocked by policy. Install Git, Python 3, Node.js 22+, and Docker Desktop manually, then run `install.ps1` again.

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/spark-ai-hub/main/uninstall.sh | bash
```

On Windows PowerShell:

```powershell
.\uninstall.ps1
```

Preserve local runtime data during uninstall:

```bash
./uninstall.sh --keep-data
```

```powershell
.\uninstall.ps1 -KeepData
```

The uninstaller now removes, in order:

- Spark AI Hub recipe containers, images, and volumes
- Backend cache/runtime paths such as `.venv` and `data/`
- Frontend cache/build paths such as `frontend/node_modules` and `frontend/dist`
- Generated recipe `.env` files
- Python cache directories such as `__pycache__`
- The installation directory itself

It does not uninstall Docker itself.

For repository contribution standards and templates, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

This repository is licensed for **strictly non-commercial use** under the terms of [`LICENSE`](./LICENSE).

Commercial use, client delivery, paid services, SaaS distribution, marketplace redistribution, and other revenue-generating usage require separate written permission from the copyright holder. See [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md).
