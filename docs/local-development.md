# Local Development Guide

This guide describes the recommended developer workflow for NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC.

It covers:

- supported development environments
- Python and Node.js setup
- backend and frontend development
- Docker-backed validation
- optional PM2-based process management for source checkouts

For deployment and installation guidance, see [`docs/installation.md`](./installation.md).

## 1. Development support matrix

| Scenario | Linux | Windows | macOS |
|----------|-------|---------|-------|
| Frontend development | Supported | Supported | Supported |
| Backend API development | Supported | Supported | Supported |
| Production-style local deployment with `install.sh` | Supported | Not supported | Not supported |
| Full local recipe runtime with NVIDIA GPU containers | Supported on compatible NVIDIA GPU hosts | Limited; use a Linux NVIDIA host for full validation | Not supported for local NVIDIA GPU runtime |
| `check.sh` / `run.sh` shell workflow | Supported | Use manual PowerShell commands instead | Supported |

## 2. Recommended tool versions

Install these tools before starting development:

- `git`
- Python `3.11+`
- Node.js `22+`
- `npm`
- Docker Engine or Docker Desktop

Optional but recommended for Linux deployment validation:

- NVIDIA GPU driver compatible with your GPU
- NVIDIA Container Toolkit
- `nvidia-smi` available on the host

Optional for long-running source-based environments:

- `pm2` for process supervision

## 3. Platform prerequisites

### Linux

Recommended for full-stack development and all GPU/runtime validation.

Install or verify:

- Python `3.11+`
- `python3-venv`
- `python3-pip`
- Node.js `22+`
- Docker Engine
- NVIDIA GPU driver and NVIDIA Container Toolkit for GPU-backed recipe validation

Useful host checks:

```bash
python3 --version
node --version
npm --version
docker --version
nvidia-smi
docker info
```

### Windows

Recommended for frontend and backend development, documentation work, and API/UI validation.

Install or verify:

- Git for Windows
- Python `3.11+`
- Node.js `22+`
- Docker Desktop
- PowerShell 7 or Windows PowerShell 5.1+

Notes:

- The repository currently provides `install.sh`, `run.sh`, and `check.sh` for shell-based environments.
- There is no Windows-native `install.ps1`, `run.ps1`, or `check.ps1` entrypoint in this repository.
- For full NVIDIA GPU recipe validation, use a compatible Linux host.

Useful host checks:

```powershell
python --version
node --version
npm --version
docker --version
docker info
```

### macOS

Recommended for frontend and backend development, documentation work, and non-GPU validation.

Install or verify:

- Homebrew or equivalent package manager
- Python `3.11+`
- Node.js `22+`
- Docker Desktop

Notes:

- Local NVIDIA GPU container execution is not supported on macOS.
- Use macOS for UI/API work, then validate GPU-dependent behavior on Linux.

Useful host checks:

```bash
python3 --version
node --version
npm --version
docker --version
docker info
```

## 4. Clone and prepare the repository

From the repository root, create the shared local configuration file and Python virtual environment.

### Linux / macOS

```bash
cp .env.example .env
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd frontend
npm install
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location frontend
npm install
```

## 5. Run the backend in development mode

### Linux / macOS

From the repository root:

```bash
. .venv/bin/activate
python -m uvicorn daemon.main:app --reload --host 127.0.0.1 --port 9000
```

### Windows PowerShell

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --reload --host 127.0.0.1 --port 9000
```

Backend URL:

- `http://127.0.0.1:9000`

## 6. Run the frontend development server

In a second terminal:

```bash
cd frontend
npm run dev
```

Frontend URL:

- `http://localhost:5173`

`frontend/vite.config.js` proxies:

- `/api` to `http://localhost:9000`
- `/ws` to `ws://localhost:9000`

## 7. Validate a production-style build

The backend serves the built frontend from `frontend/dist`.

Run:

```bash
cd frontend
npm run lint
npm run build
```

Then start the backend and open:

- `http://127.0.0.1:9000`

Recommended validation steps:

- frontend lint passes: `npm run lint`
- frontend production build passes: `npm run build`
- backend starts without startup exceptions
- `GET /api/recipes` responds successfully
- backend-served UI loads from `frontend/dist`

## 8. Docker and GPU validation

Docker is optional for UI-only development, but required for recipe lifecycle testing.

### Minimum Docker checks

```bash
docker --version
docker info
```

### Linux NVIDIA runtime checks

Run these checks on the Linux host that will run GPU-backed recipes:

```bash
nvidia-smi
docker info | grep -i runtime
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

If the last command fails, fix the NVIDIA driver or NVIDIA Container Toolkit before validating GPU recipes.

## 9. Shell workflow helpers

The repository includes shell entrypoints for Linux and macOS-style environments:

- `./check.sh` validates the local environment
- `./run.sh` installs Python dependencies and starts the API
- `./install.sh` performs opinionated Linux installation on `apt`-based systems
- `./uninstall.sh` removes a source-installed Linux deployment

Notes:

- `check.sh` is designed for shell environments and may produce false negatives in Windows PowerShell contexts.
- `run.sh` and `install.sh` assume Linux-oriented commands such as `python3`, `apt-get`, and POSIX shell behavior.

## 10. Optional PM2 process management

PM2 is optional. It is useful when running a source checkout as a long-lived process outside systemd or container orchestration.

Install PM2 globally:

```bash
npm install -g pm2
```

Start the backend from the repository root:

```bash
pm2 start ".venv/bin/python -m uvicorn daemon.main:app --host 0.0.0.0 --port 9000" --name nvidia-ai-hub
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs nvidia-ai-hub
pm2 restart nvidia-ai-hub
pm2 stop nvidia-ai-hub
pm2 delete nvidia-ai-hub
```

Windows note:

- PM2 can supervise a local Node-managed process on Windows, but Windows is still documented here as a development environment, not the primary production deployment target for GPU-backed workloads.

## 11. Common issues

### Blank or white page when opening the backend URL

This usually means the production frontend bundle was not generated or is stale.

Fix:

1. Run `cd frontend && npm run build`
2. Confirm `frontend/dist/index.html` exists
3. Restart the backend

### `python -m venv .venv` fails

Install the Python venv support package for your platform.

On Debian or Ubuntu:

```bash
sudo apt-get install python3-venv
```

### Docker daemon is not reachable

Start Docker Desktop or the Docker service, then retry `docker info`.

### GPU metrics are unavailable

The monitoring path uses `nvidia-smi` where available. If `nvidia-smi` is missing, GPU temperature and utilization reporting will be limited or unavailable.

## 12. Developer validation checklist

Before submitting changes, record validation appropriate to the files you touched.

Typical checks:

- `npm run lint`
- `npm run build`
- `python -m compileall daemon`
- recipe load smoke test:
   - `python -c "from daemon.services.registry_service import load_recipes; print(len(load_recipes()))"`
- targeted `docker compose config -q` for changed recipes

If you changed installation or runtime docs, confirm the commands match the current repository layout and supported platforms.
