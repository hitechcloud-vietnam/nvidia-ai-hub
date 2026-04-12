# Local Run Guide

This guide shows how to run Spark AI Hub locally from a cloned repository, one command at a time.

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

- Use `./run.sh` on Linux or macOS.
- If port `8000` is already in use, stop the running process first or use another port such as `8001`.
- Run commands from the same repository where `frontend/dist` was built.

## Quick restart

```bash
cd /path/to/spark-ai-hub
./run.sh --host 127.0.0.1 --port 8000
```

Then open:

```text
http://127.0.0.1:8000/
```
