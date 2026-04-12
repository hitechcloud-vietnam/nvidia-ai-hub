# Local Direct Run Guide

This guide runs Spark AI Hub locally without using `run.ps1`, `run.sh`, `install.ps1`, or `install.sh`.

It uses direct commands only.

## Windows PowerShell

### 1. Open the repository root

```powershell
Set-Location "D:\Pho Tue SoftWare Solutions JSC\App\spark-ai-hub"
```

### 2. Create a virtual environment

```powershell
python -m venv .venv
```

### 3. Activate the virtual environment

```powershell
.\.venv\Scripts\Activate.ps1
```

### 4. Install backend dependencies

```powershell
pip install -r requirements.txt
```

### 5. Move to the frontend folder

```powershell
Set-Location .\frontend
```

### 6. Install frontend dependencies

```powershell
npm install
```

### 7. Build the frontend

```powershell
npm run build
```

### 8. Return to the repository root

```powershell
Set-Location ..
```

### 9. Start the backend directly

```powershell
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --host 127.0.0.1 --port 8000
```

### 10. Open the UI in a browser

```text
http://127.0.0.1:8000/
```

## Linux or macOS

### 1. Open the repository root

```bash
cd /path/to/spark-ai-hub
```

### 2. Create a virtual environment

```bash
python3 -m venv .venv
```

### 3. Activate the virtual environment

```bash
source .venv/bin/activate
```

### 4. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 5. Move to the frontend folder

```bash
cd frontend
```

### 6. Install frontend dependencies

```bash
npm install
```

### 7. Build the frontend

```bash
npm run build
```

### 8. Return to the repository root

```bash
cd ..
```

### 9. Start the backend directly

```bash
.venv/bin/python -m uvicorn daemon.main:app --host 127.0.0.1 --port 8000
```

### 10. Open the UI in a browser

```text
http://127.0.0.1:8000/
```

## Optional checks

Check backend health from another terminal:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/ | Select-Object StatusCode
```

List recipes from the API:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/recipes | Select-Object -ExpandProperty Content
```

## Common mistakes

- Do not use `.run.ps1`; that path is invalid.
- Do not use `-Host` with the PowerShell helper script on older instructions.
- Do not type the URL into PowerShell if you expect a visual UI. Open it in a browser.
- If port `8000` is already in use, stop the old process or start on another port.
- Run all commands from the same repository where `frontend/dist` was built.

## Note about recent recipe work

The direct `uvicorn` flow above does not depend on `run.ps1` or `run.sh`.
If the repository worked before the `OpenClaw` and `NemoClaw` changes on commit `dff8f69d7fa049979225e83b3036af57373155ae`, this document keeps the startup path equivalent by using the backend entrypoint directly.
