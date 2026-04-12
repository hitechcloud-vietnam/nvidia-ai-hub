# Local Run Guide

This guide shows how to run Spark AI Hub locally from a cloned repository, one command at a time.

## Windows PowerShell

### 1. Open the repository root

```powershell
Set-Location "D:\Pho Tue SoftWare Solutions JSC\App\spark-ai-hub"
```

### 2. Check the environment

```powershell
.\check.ps1
```

### 3. Create the virtual environment if it does not exist

```powershell
python -m venv .venv
```

### 4. Activate the virtual environment

```powershell
.\.venv\Scripts\Activate.ps1
```

### 5. Install backend dependencies

```powershell
pip install -r requirements.txt
```

### 6. Go to the frontend directory

```powershell
Set-Location .\frontend
```

### 7. Install frontend dependencies

```powershell
npm install
```

### 8. Build the frontend

```powershell
npm run build
```

### 9. Return to the repository root

```powershell
Set-Location ..
```

### 10. Start the app with the helper script

```powershell
.\run.ps1 -ListenHost 127.0.0.1 -Port 8000
```

### 11. Open the UI

Open this URL in a browser:

```text
http://127.0.0.1:8000/
```

## Windows direct backend start

Use this when you want to bypass `run.ps1`.

### 1. Open the repository root

```powershell
Set-Location "D:\Pho Tue SoftWare Solutions JSC\App\spark-ai-hub"
```

### 2. Start the backend directly

```powershell
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --host 127.0.0.1 --port 8000
```

### 3. Open the UI

Open this URL in a browser:

```text
http://127.0.0.1:8000/
```

## Linux or macOS

### 1. Open the repository root

```bash
cd /path/to/spark-ai-hub
```

### 2. Check the environment

```bash
./check.sh
```

### 3. Create the virtual environment

```bash
python3 -m venv .venv
```

### 4. Activate the virtual environment

```bash
source .venv/bin/activate
```

### 5. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 6. Go to the frontend directory

```bash
cd frontend
```

### 7. Install frontend dependencies

```bash
npm install
```

### 8. Build the frontend

```bash
npm run build
```

### 9. Return to the repository root

```bash
cd ..
```

### 10. Start the app

```bash
./run.sh --host 127.0.0.1 --port 8000
```

### 11. Open the UI

Open this URL in a browser:

```text
http://127.0.0.1:8000/
```

## Common mistakes

- Use `./run.sh` on Linux or macOS, and `./run.ps1` only in PowerShell as `.\run.ps1`.
- Do not type the URL into PowerShell. Open it in a browser.
- If port `8000` is already in use, stop the running process first or use another port such as `8001`.
- Run commands from the same repository where `frontend/dist` was built.
- On Windows PowerShell, use `-ListenHost`, not `-Host`.

## Quick restart

If the app was already prepared before, the shortest Windows flow is:

```powershell
Set-Location "D:\Pho Tue SoftWare Solutions JSC\App\spark-ai-hub"
.\run.ps1 -ListenHost 127.0.0.1 -Port 8000
```

Then open:

```text
http://127.0.0.1:8000/
```
