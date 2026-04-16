# Installation and Deployment Guide

This guide explains how to install and operate NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC across Linux, Windows, and macOS environments.

It separates:

- **supported production deployment** on Linux NVIDIA GPU hosts
- **developer workstation setup** on Windows and macOS
- **optional PM2-based source deployment** for lightweight persistence

For day-to-day coding workflows, see [`docs/local-development.md`](./local-development.md).

For Linux production-style service layout, reverse proxy patterns, TLS notes, and LAN/public exposure guidance, see [`docs/deployment-production.md`](./deployment-production.md).

For tracked deployment example files that can be adapted locally, see the `deploy/` directory in the repository root.

## 1. Platform support summary

| Platform | Source development | Quick installer | Full local GPU recipe runtime | Recommended use |
|----------|--------------------|-----------------|-------------------------------|-----------------|
| Linux | Supported | Supported | Supported on compatible NVIDIA GPU hosts | Primary deployment and validation platform |
| Windows | Supported | Not supported | Limited for local NVIDIA GPU deployment | Developer workstation, UI/API work |
| macOS | Supported | Not supported | Not supported | Developer workstation, UI/API work |

## 2. Core software requirements

### Required for development

- Git
- Python `3.11+`
- Node.js `22+`
- `npm`
- Docker Engine or Docker Desktop

### Required for full Linux GPU deployment

- Supported Linux host
- Supported NVIDIA GPU
- Installed NVIDIA GPU driver
- Docker Engine
- NVIDIA Container Toolkit or equivalent NVIDIA runtime integration
- `nvidia-smi` available on the host

### Optional

- `pm2` for persistent source-based process management
- reverse proxy such as Nginx, Caddy, or Traefik for exposed deployments

## 3. Linux deployment

Linux is the only documented platform for full local deployment, GPU-backed recipe execution, and the one-command installer.

### 3.1 Recommended host profile

- Ubuntu or Debian-based Linux environment with `apt-get`
- Docker Engine installed or installable
- NVIDIA driver already working with `nvidia-smi`
- NVIDIA Container Toolkit configured for Docker GPU access
- internet access during initial install
- sudo access

### 3.2 Validate the host before installation

```bash
python3 --version
node --version
npm --version
docker --version
docker info
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

Expected result:

- Python, Node.js, npm, and Docker commands respond successfully
- `nvidia-smi` reports the installed GPU
- the GPU-enabled Docker test can access the GPU

### 3.3 Quick install on Linux

The repository includes an opinionated installer for `apt`-based Linux systems:

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/nvidia-ai-hub/main/install.sh | bash
```

Optional flags:

```bash
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/nvidia-ai-hub/main/install.sh | bash -s -- --no-start
curl -fsSL https://raw.githubusercontent.com/hitechcloud-vietnam/nvidia-ai-hub/main/install.sh | bash -s -- --host 127.0.0.1 --port 9010
```

What the installer currently does:

- installs `git` if missing
- installs `python3`, `python3-venv`, and `pip` if missing
- installs Docker Engine if missing
- clones or updates the repository into `$HOME/nvidia-ai-hub`
- creates `.venv`
- installs backend dependencies
- starts the FastAPI service with `uvicorn`

Important limitations:

- the current installer is written for Linux shell environments
- it is designed around `apt-get`
- it does not currently install the NVIDIA driver or NVIDIA Container Toolkit for you
- GPU runtime prerequisites must already be configured on the host

### 3.4 Manual Linux install from a clone

```bash
git clone https://github.com/hitechcloud-vietnam/nvidia-ai-hub.git
cd nvidia-ai-hub
cp .env.example .env
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd frontend
npm install
npm run build
cd ..
python -m uvicorn daemon.main:app --host 0.0.0.0 --port 9000
```

Open:

- `http://localhost:9000`
- or `http://<your-host-ip>:9000`

### 3.5 Linux environment checks

The repository includes:

```bash
./check.sh
```

This validates:

- Python availability
- venv support
- pip
- frontend bundle state
- Node.js and npm when rebuilds are needed
- Docker CLI and daemon reachability
- key repository files
- configured service port availability

### 3.6 Optional PM2 deployment on Linux

PM2 is optional and can be used when you want a lightweight persistent process without wiring up systemd.

Install PM2:

```bash
npm install -g pm2
```

Start the API:

```bash
cd ~/nvidia-ai-hub
pm2 start ".venv/bin/python -m uvicorn daemon.main:app --host 0.0.0.0 --port 9000" --name nvidia-ai-hub
pm2 save
```

Common commands:

```bash
pm2 status
pm2 logs nvidia-ai-hub
pm2 restart nvidia-ai-hub
pm2 stop nvidia-ai-hub
```

Use PM2 only after confirming the app starts correctly with a normal foreground command.

## 4. Windows setup

Windows is documented as a developer environment, not the primary full local GPU deployment target.

### 4.1 Install prerequisites

Install manually:

- Git for Windows
- Python `3.11+`
- Node.js `22+`
- Docker Desktop

Optional:

- WSL2 for Linux-like tooling
- PM2 for local process supervision

### 4.2 Prepare a development checkout

In PowerShell:

```powershell
git clone https://github.com/hitechcloud-vietnam/nvidia-ai-hub.git
Set-Location nvidia-ai-hub
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location frontend
npm install
npm run build
Set-Location ..
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --host 127.0.0.1 --port 9000
```

### 4.3 Windows limitations

- There is no Windows-native `install.ps1` in this repository.
- There is no Windows-native `run.ps1` or `check.ps1` in this repository.
- Shell helpers such as `install.sh`, `run.sh`, and `check.sh` are Linux-oriented.
- Full NVIDIA GPU recipe validation should be performed on Linux.

### 4.4 Optional PM2 on Windows

If you want a supervised local process:

```powershell
npm install -g pm2
pm2 start ".\.venv\Scripts\python.exe -m uvicorn daemon.main:app --host 127.0.0.1 --port 9000" --name nvidia-ai-hub
pm2 status
```

Use this only for local convenience. It does not change the platform support boundary for GPU-backed workloads.

## 5. macOS setup

macOS is documented as a developer environment for frontend, backend, and documentation work.

### 5.1 Install prerequisites

Install manually:

- Git
- Python `3.11+`
- Node.js `22+`
- Docker Desktop

Optional:

- Homebrew
- PM2

### 5.2 Prepare a development checkout

```bash
git clone https://github.com/hitechcloud-vietnam/nvidia-ai-hub.git
cd nvidia-ai-hub
cp .env.example .env
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd frontend
npm install
npm run build
cd ..
python -m uvicorn daemon.main:app --host 127.0.0.1 --port 9000
```

### 5.3 macOS limitations

- Local NVIDIA GPU container execution is not supported on macOS.
- Recipe validation that depends on NVIDIA runtime or `nvidia-smi` should be completed on Linux.
- The quick installer is not designed for macOS.

## 6. Docker, driver, and NVIDIA runtime guidance

### Docker

Use Docker Engine on Linux or Docker Desktop on Windows/macOS.

Minimum checks:

```bash
docker --version
docker info
```

### NVIDIA driver

For GPU-backed recipe execution on Linux, the host driver must already be installed and working.

Check:

```bash
nvidia-smi
```

### NVIDIA Container Toolkit

For GPU-backed containers on Linux, ensure Docker can access the GPU.

Example validation:

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

If this command fails, resolve the driver or toolkit configuration before validating recipes.

## 7. Python and Node.js guidance

### Python

- Use Python `3.11+`
- Prefer isolated virtual environments with `.venv`
- Install backend dependencies from `requirements.txt`

### Node.js

- Use Node.js `22+`
- Install frontend dependencies from `frontend/package.json`
- Run `npm run lint` and `npm run build` before merging frontend changes

## 8. Operational notes

### Default URLs

- UI: `http://localhost:9000`
- API root: `http://localhost:9000`

### Shared configuration

The repository uses a shared root `.env` file with values such as:

- `SPARK_AI_HUB_HOST`
- `SPARK_AI_HUB_PORT`
- `SPARK_AI_HUB_NODE_MAJOR`
- `SPARK_AI_HUB_REGISTRY_PATH`
- `SPARK_AI_HUB_DATA_DIR`
- `SPARK_AI_HUB_DB_PATH`

### Uninstall

Linux source uninstall:

```bash
./uninstall.sh
```

Data-preserving uninstall:

```bash
./uninstall.sh --keep-data
```

Note:

- The repository currently includes `uninstall.sh`.
- A Windows-native `uninstall.ps1` is not present in this workspace and should not be referenced as an available command.

## 9. Deployment validation checklist

For Linux deployment documentation or operational changes, record validation such as:

- `npm run lint`
- `npm run build`
- `python -m compileall daemon`
- backend startup with `uvicorn`
- `./check.sh`
- `docker info`
- `nvidia-smi` on GPU hosts
- targeted `docker compose config -q` for changed recipes

If a step was not run on the current machine, note that clearly and explain the reviewer risk.