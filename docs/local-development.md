# Local Development and Build Guide

This guide describes the recommended local development workflow for `spark-ai-hub`.

It covers:

- backend API development (`FastAPI`)
- frontend development (`React + Vite`)
- local production build validation
- blank/white-page troubleshooting

## Prerequisites

- Python 3.11+
- Node.js 22+
- npm
- Docker (required for recipe lifecycle testing; optional for UI-only development)

## 1) Clone and prepare environment

From the repository root:

```bash
cp .env.example .env
python -m venv .venv
```

On PowerShell:

```powershell
Copy-Item .env.example .env
python -m venv .venv
```

Install backend dependencies:

```bash
.venv/bin/python -m pip install -r requirements.txt
```

On PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## 2) Run backend (API)

From repository root:

```bash
.venv/bin/python -m uvicorn daemon.main:app --reload --host 127.0.0.1 --port 9000

uvicorn daemon.main:app --host 0.0.0.0 --port 9000
```
python -m pip install psutil==7.0.0
On PowerShell:

```powershell
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --reload --host 127.0.0.1 --port 9000
```

Backend URL:

- `http://127.0.0.1:9000`

## 3) Run frontend dev server (Vite)

In a second terminal:

```bash
cd frontend
npm run dev
```

Frontend URL:

- `http://localhost:5173`

`frontend/vite.config.js` proxies these paths to the backend:

- `/api` → `http://localhost:9000`
- `/ws` → `ws://localhost:9000`

## 4) Validate production frontend build

The backend serves the built frontend from `frontend/dist`.

Build and verify:

```bash
cd frontend
npm run lint
npm run build
```

Then start backend and open:

- `http://127.0.0.1:9000`

## White page / blank render troubleshooting

If the app renders a blank page when opened via the backend URL:

1. Rebuild frontend assets:
   - `cd frontend && npm run build`
2. Verify `frontend/dist/index.html` exists.
3. Verify browser network requests for `/assets/*.js` and `/assets/*.css` return `200`.
4. Restart backend.

Important:

- For backend-served UI, always validate against `frontend/dist` output.
- `frontend/index.html` is a Vite source entry and is not a production bundle.

## Suggested local validation checklist

- Frontend lint passes: `npm run lint`
- Frontend production build passes: `npm run build`
- Backend starts without startup exceptions
- `GET /api/recipes` responds `200`
- UI loads at both:
  - `http://localhost:5173` (Vite dev)
  - `http://127.0.0.1:9000` (backend-served production bundle)