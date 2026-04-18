# Local Development Guide

This guide is the canonical source for contributor setup, source-based development, and local validation.

Use this document for:

- backend development in `daemon/`
- frontend development in `frontend/`
- local source setup on Linux, Windows, and macOS
- production-style build validation before submitting changes

For install and operator guidance, use [`installation.md`](./installation.md). For Linux service and reverse proxy guidance, use [`deployment-production.md`](./deployment-production.md).

## 1. Development support matrix

| Scenario | Linux | Windows | macOS |
|---|---|---|---|
| Frontend development | Supported | Supported | Supported |
| Backend API development | Supported | Supported | Supported |
| Local production-style source run | Supported | Supported with manual commands | Supported |
| Quick installer `install.sh` | Supported | Not supported | Not supported |
| Full local GPU-backed recipe validation | Supported on compatible NVIDIA GPU hosts | Limited | Not supported |

## 2. Required tools

Install and verify:

- `git`
- Python `3.11+`
- Node.js `22+`
- `npm`
- Docker Engine or Docker Desktop

Optional for Linux GPU validation:

- NVIDIA GPU driver
- NVIDIA Container Toolkit or equivalent runtime integration
- `nvidia-smi`

## 3. Prepare the repository

### Linux / macOS

```bash
cp .env.example .env
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd frontend
npm install
cd ..
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location frontend
npm install
Set-Location ..
```

## 4. Run the backend for development

### Linux / macOS

```bash
. .venv/bin/activate
python -m uvicorn daemon.main:app --reload --host 127.0.0.1 --port 9000
```

### Windows PowerShell

```powershell
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --reload --host 127.0.0.1 --port 9000
```

Backend URL:

- `http://127.0.0.1:9000`

## 5. Run the frontend development server

In a second terminal:

```bash
cd frontend
npm run dev
```

Frontend URL:

- `http://localhost:5173`

The Vite development server proxies application API calls to the backend.

## 6. Validate the production build

The production app is served from `frontend/dist`. Before submitting frontend or integrated backend/frontend changes, run:

```bash
cd frontend
npm run lint
npm run build
```

Then verify the backend-served build:

1. start the backend
2. open `http://127.0.0.1:9000`
3. confirm the UI loads from the built assets
4. confirm `GET /api/recipes` responds successfully

## 7. Recommended validation by change type

### Frontend changes

- `npm run lint`
- `npm run build`
- brief manual verification note for the changed flow

### Backend changes

- `python -m compileall daemon`
- start the backend if practical
- check affected API paths or startup behavior

### Script changes

- record the operating system and shell used
- state clearly when Linux-only behavior was reviewed statically rather than executed

### Recipe changes

- identify exact recipe slugs touched
- record whether validation was smoke-tested or metadata-only

## 8. Docker and GPU validation

Docker is required for recipe lifecycle testing. GPU validation should be performed on a supported Linux NVIDIA host.

Baseline checks:

```bash
docker --version
docker info
```

Linux NVIDIA checks:

```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

If GPU runtime validation is unavailable in the current environment, state that clearly in validation notes.

## 9. Helper scripts

Repository root scripts:

- `./check.sh` — environment and dependency checks for shell environments
- `./run.sh` — local source run with persisted `.env` support
- `./install.sh` — Linux installer for `apt`-based environments
- `./uninstall.sh` — Linux removal helper

Important boundary:

- there is no `install.ps1`, `run.ps1`, or `check.ps1` in this repository
- Windows contributors should use direct PowerShell commands instead
- `check.sh` may produce misleading results in Windows contexts

## 10. Shared configuration

Local configuration lives in the repository root `.env` file.

Common keys:

- `NVIDIA_AI_HUB_HOST`
- `NVIDIA_AI_HUB_PORT`
- `NVIDIA_AI_HUB_DB_PATH`
- `NVIDIA_AI_HUB_DATA_DIR`
- `NVIDIA_AI_HUB_REGISTRY_PATH`

Do not commit secrets, credentials, or machine-specific private endpoints.

## 11. Common issues

### Blank page or missing styles from the backend URL

Cause: `frontend/dist` is missing or stale.

Fix:

```bash
cd frontend
npm run build
```

Then restart the backend.

### `python -m venv .venv` fails

Install Python venv support.

Debian or Ubuntu example:

```bash
sudo apt-get install python3-venv
```

### Docker daemon is unavailable

Start Docker Desktop or the Docker service, then retry `docker info`.

### GPU metrics are missing

Some monitoring features rely on `nvidia-smi` or host-specific GPU tools. If those tools are absent, GPU telemetry may be partial.

## 12. Submission expectation

Before opening a pull request:

- keep the change scoped
- update docs when behavior changed
- record concrete validation evidence
- call out any untested runtime behavior or platform limits

Use [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for repository policy and pull request expectations.
- `npm run build`
- `python -m compileall daemon`
- recipe load smoke test:
   - `python -c "from daemon.services.registry_service import load_recipes; print(len(load_recipes()))"`
- targeted `docker compose config -q` for changed recipes

If you changed installation or runtime docs, confirm the commands match the current repository layout and supported platforms.
