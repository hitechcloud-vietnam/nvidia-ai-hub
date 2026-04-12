from __future__ import annotations

import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel


OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
STARTER_MODEL = os.environ.get("STARTER_MODEL", "qwen3.5:4b")
STARTER_DISPLAY_NAME = os.environ.get("STARTER_DISPLAY_NAME", STARTER_MODEL)
SHARED_ENDPOINT = os.environ.get("SHARED_ENDPOINT", "http://host.docker.internal:11435")
REQUEST_TIMEOUT = 10

CATALOG = [
    # Qwen 3.5
    {"name": "qwen3.5:0.8b", "title": "Qwen 3.5 0.8B", "summary": "Tiny, ultra-fast Qwen model for quick experiments.", "size": "540 MB", "capabilities": ["chat"]},
    {"name": "qwen3.5:2b", "title": "Qwen 3.5 2B", "summary": "Lightweight Qwen with solid quality for its size.", "size": "1.6 GB", "capabilities": ["chat"]},
    {"name": "qwen3.5:4b", "title": "Qwen 3.5 4B", "summary": "Recommended starter model. Great balance of speed and quality.", "size": "2.6 GB", "capabilities": ["chat", "general"]},
    {"name": "qwen3.5:9b", "title": "Qwen 3.5 9B", "summary": "Strong general-purpose chat model with higher quality output.", "size": "5.6 GB", "capabilities": ["chat", "general"]},
    {"name": "qwen3.5:27b", "title": "Qwen 3.5 27B", "summary": "High-quality chat and reasoning for complex tasks.", "size": "17 GB", "capabilities": ["chat", "reasoning"]},
    {"name": "qwen3.5:35b-a3b", "title": "Qwen 3.5 35B-A3B", "summary": "MoE model. Only 3B active params, fast with 35B quality.", "size": "21 GB", "capabilities": ["chat", "reasoning"]},
    # Gemma 4
    {"name": "gemma4:e2b", "title": "Gemma 4 E2B", "summary": "Google's smallest Gemma 4. Fast and efficient.", "size": "1.8 GB", "capabilities": ["chat"]},
    {"name": "gemma4:e4b", "title": "Gemma 4 E4B", "summary": "Compact Gemma 4 with multimodal capabilities.", "size": "3.3 GB", "capabilities": ["chat", "vision"]},
    {"name": "gemma4:26b", "title": "Gemma 4 26B", "summary": "Large Gemma 4 MoE with strong reasoning and vision.", "size": "16 GB", "capabilities": ["chat", "vision", "reasoning"]},
    {"name": "gemma4:31b", "title": "Gemma 4 31B", "summary": "Largest Gemma 4. Excellent quality across all tasks.", "size": "19 GB", "capabilities": ["chat", "vision", "reasoning"]},
    # GPT-OSS
    {"name": "gpt-oss:20b", "title": "GPT-OSS 20B", "summary": "Open-source GPT model. Strong general chat capabilities.", "size": "12 GB", "capabilities": ["chat", "general"]},
    {"name": "gpt-oss:120b", "title": "GPT-OSS 120B", "summary": "Largest open GPT. Needs 70+ GB. Frontier-level quality.", "size": "71 GB", "capabilities": ["chat", "reasoning"]},
    # GLM
    {"name": "glm-4.7-flash", "title": "GLM 4.7 Flash", "summary": "Fast bilingual (EN/ZH) model with tool use and long context.", "size": "5.5 GB", "capabilities": ["chat", "tools"]},
    # Popular general purpose
    {"name": "llama3.2:3b", "title": "Llama 3.2 3B", "summary": "Meta's compact chat model for lightweight tasks.", "size": "2.0 GB", "capabilities": ["chat"]},
    {"name": "llama3.3:70b", "title": "Llama 3.3 70B", "summary": "Meta's strongest open model. Needs 40+ GB.", "size": "43 GB", "capabilities": ["chat", "reasoning"]},
    {"name": "phi4:14b", "title": "Phi 4 14B", "summary": "Microsoft's reasoning-focused model. Strong at math and code.", "size": "9.1 GB", "capabilities": ["chat", "reasoning", "code"]},
    {"name": "mistral:7b", "title": "Mistral 7B", "summary": "Fast, versatile European model. Great all-rounder.", "size": "4.1 GB", "capabilities": ["chat", "general"]},
    {"name": "deepseek-r1:8b", "title": "DeepSeek R1 8B", "summary": "Reasoning-first model with chain-of-thought.", "size": "4.9 GB", "capabilities": ["reasoning"]},
    # Code
    {"name": "qwen2.5-coder:7b", "title": "Qwen 2.5 Coder 7B", "summary": "Specialized for code completion, edits, and generation.", "size": "4.7 GB", "capabilities": ["code"]},
    {"name": "codellama:7b", "title": "Code Llama 7B", "summary": "Meta's code-specialized Llama. Solid for completions.", "size": "3.8 GB", "capabilities": ["code"]},
    # Embedding
    {"name": "nomic-embed-text", "title": "Nomic Embed Text", "summary": "Embedding model for search, retrieval, and RAG pipelines.", "size": "274 MB", "capabilities": ["embedding"]},
    {"name": "mxbai-embed-large", "title": "MxBai Embed Large", "summary": "High-quality embeddings for semantic search and clustering.", "size": "669 MB", "capabilities": ["embedding"]},
]


class PullRequest(BaseModel):
    name: str


class DeleteRequest(BaseModel):
    name: str


app = FastAPI(title="Ollama Runtime")
state_lock = threading.Lock()
jobs: dict[str, dict[str, Any]] = {}
# Track models being deleted: name -> True
_deleting: dict[str, bool] = {}
starter_bootstrap_finished = False


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ollama_get(path: str) -> requests.Response:
    return requests.get(f"{OLLAMA_BASE_URL}{path}", timeout=REQUEST_TIMEOUT)


def ollama_post(path: str, payload: dict[str, Any], *, stream: bool = False) -> requests.Response:
    return requests.post(
        f"{OLLAMA_BASE_URL}{path}",
        json=payload,
        timeout=REQUEST_TIMEOUT if not stream else None,
        stream=stream,
    )


def ollama_delete(path: str, payload: dict[str, Any]) -> requests.Response:
    return requests.delete(
        f"{OLLAMA_BASE_URL}{path}",
        json=payload,
        timeout=REQUEST_TIMEOUT,
    )


def list_models() -> list[dict[str, Any]]:
    try:
        response = ollama_get("/api/tags")
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException:
        return []

    models = []
    for model in payload.get("models", []):
        details = model.get("details") or {}
        models.append(
            {
                "name": model.get("name", ""),
                "size": model.get("size", 0),
                "size_gb": round((model.get("size", 0) or 0) / (1024 ** 3), 2),
                "modified_at": model.get("modified_at", ""),
                "digest": model.get("digest", ""),
                "parameter_size": details.get("parameter_size", ""),
                "family": details.get("family", ""),
                "quantization_level": details.get("quantization_level", ""),
            }
        )
    return models


def starter_present() -> bool:
    return any(model["name"] == STARTER_MODEL for model in list_models())


def normalize_model_name(name: str) -> str:
    return name[:-7] if name.endswith(":latest") else name


def model_present(name: str) -> bool:
    target = normalize_model_name(name)
    return any(normalize_model_name(model["name"]) == target for model in list_models())


def get_version() -> str:
    try:
        response = ollama_get("/api/version")
        response.raise_for_status()
        return response.json().get("version", "")
    except requests.RequestException:
        return ""


def get_running_models() -> list[dict[str, Any]]:
    try:
        response = ollama_get("/api/ps")
        response.raise_for_status()
        payload = response.json()
        return payload.get("models", [])
    except requests.RequestException:
        return []


def create_job(name: str, source: str) -> dict[str, Any]:
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "name": name,
        "status": "queued",
        "source": source,
        "started_at": utc_now(),
        "updated_at": utc_now(),
        "completed_at": "",
        "progress": 0.0,
        "completed": 0,
        "total": 0,
        "error": "",
        "message": "",
    }
    with state_lock:
        jobs[job_id] = job
    return job


def active_pull_for(name: str) -> dict[str, Any] | None:
    with state_lock:
        for job in jobs.values():
            if job["name"] == name and job["status"] in {"queued", "running"}:
                return dict(job)
    return None


def update_job(job_id: str, **changes: Any) -> None:
    with state_lock:
        job = jobs.get(job_id)
        if not job:
            return
        job.update(changes)
        job["updated_at"] = utc_now()


def pull_model_background(job_id: str, name: str) -> None:
    update_job(job_id, status="running", message="Starting download")
    try:
        response = ollama_post("/api/pull", {"name": name, "stream": True}, stream=True)
        response.raise_for_status()

        for raw_line in response.iter_lines():
            if not raw_line:
                continue
            event = json.loads(raw_line.decode("utf-8"))
            total = event.get("total") or 0
            completed = event.get("completed") or 0
            progress = round((completed / total) * 100, 2) if total else 0.0
            status = event.get("status", "")
            with state_lock:
                current = dict(jobs.get(job_id, {}))
            progress = max(progress, float(current.get("progress") or 0.0))
            total = max(total, int(current.get("total") or 0))
            completed = max(completed, int(current.get("completed") or 0))

            if status == "success" and model_present(name):
                update_job(
                    job_id,
                    message="Download complete",
                    total=total,
                    completed=completed,
                    progress=100.0,
                    status="completed",
                    completed_at=utc_now(),
                )
                return

            update_job(
                job_id,
                message=status,
                total=total,
                completed=completed,
                progress=progress,
                status="running",
            )

        for _ in range(20):
            if model_present(name):
                update_job(job_id, status="completed", progress=100.0, completed_at=utc_now(), message="Download complete")
                return
            time.sleep(1)

        update_job(job_id, status="failed", error="Model was not available after pull completed", message="Download did not finish cleanly", completed_at=utc_now())
    except requests.RequestException as exc:
        update_job(job_id, status="failed", error=str(exc), message="Download failed", completed_at=utc_now())
    except Exception as exc:
        update_job(job_id, status="failed", error=str(exc), message="Download failed", completed_at=utc_now())


def ensure_model_pull(name: str, source: str) -> dict[str, Any]:
    existing = active_pull_for(name)
    if existing:
        return existing

    job = create_job(name, source)
    worker = threading.Thread(target=pull_model_background, args=(job["id"], name), daemon=True)
    worker.start()
    return job


def bootstrap_starter_model() -> None:
    global starter_bootstrap_finished
    while not starter_bootstrap_finished:
        if starter_present():
            starter_bootstrap_finished = True
            return

        try:
            version = get_version()
        except Exception:
            version = ""

        if version and not active_pull_for(STARTER_MODEL):
            job = ensure_model_pull(STARTER_MODEL, "startup")
            while True:
                with state_lock:
                    current = dict(jobs.get(job["id"], {}))
                status = current.get("status")
                if status == "completed":
                    starter_bootstrap_finished = True
                    return
                if status == "failed":
                    break
                time.sleep(2)

        time.sleep(5)


@app.on_event("startup")
def on_startup() -> None:
    threading.Thread(target=bootstrap_starter_model, daemon=True).start()


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return INDEX_HTML


@app.get("/ollama-official.png")
def logo() -> FileResponse:
    return FileResponse("ollama-official.png", media_type="image/png")


@app.get("/api/health")
def api_health() -> JSONResponse:
    version = get_version()
    models = list_models()
    starter_ready = any(model["name"] == STARTER_MODEL for model in models)
    status_code = 200 if version and starter_ready else 503
    payload = {
        "reachable": bool(version),
        "version": version,
        "starter_model": STARTER_MODEL,
        "starter_display_name": STARTER_DISPLAY_NAME,
        "starter_ready": starter_ready,
        "shared_endpoint": SHARED_ENDPOINT,
        "installed_models": len(models),
    }
    return JSONResponse(payload, status_code=status_code)


@app.get("/api/runtime")
def api_runtime() -> dict[str, Any]:
    version = get_version()
    models = list_models()
    return {
        "reachable": bool(version),
        "version": version,
        "shared_endpoint": SHARED_ENDPOINT,
        "starter_model": STARTER_MODEL,
        "starter_display_name": STARTER_DISPLAY_NAME,
        "starter_ready": any(model["name"] == STARTER_MODEL for model in models),
        "installed_models": len(models),
        "running_models": len(get_running_models()),
    }


@app.get("/api/models")
def api_models() -> dict[str, Any]:
    models = list_models()
    running = get_running_models()
    running_names = {m.get("name", "") for m in running}
    for m in models:
        m["loaded"] = m["name"] in running_names
        pull = active_pull_for(m["name"])
        m["downloading"] = pull is not None
        m["download_progress"] = pull["progress"] if pull else 0
        m["deleting"] = _deleting.get(m["name"], False)
    return {"models": models}


@app.get("/api/catalog")
def api_catalog() -> dict[str, Any]:
    installed_models = list_models()
    installed_names = {normalize_model_name(m["name"]) for m in installed_models}
    result = []
    for entry in CATALOG:
        e = dict(entry)
        norm = normalize_model_name(e["name"])
        e["installed"] = norm in installed_names
        pull = active_pull_for(e["name"])
        e["downloading"] = pull is not None
        e["download_progress"] = pull["progress"] if pull else 0
        result.append(e)
    return {"models": result}


@app.get("/api/downloads")
def api_downloads() -> dict[str, Any]:
    with state_lock:
        items = sorted(jobs.values(), key=lambda item: item["started_at"], reverse=True)
        return {"downloads": items[:20]}


@app.post("/api/models/pull")
def api_pull_model(body: PullRequest) -> dict[str, Any]:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Model name is required")
    job = ensure_model_pull(name, "manual")
    return {"job": job}


@app.post("/api/models/delete")
def api_delete_model(body: DeleteRequest) -> dict[str, Any]:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Model name is required")

    active = active_pull_for(name)
    if active:
        raise HTTPException(status_code=409, detail="Model is currently downloading")

    _deleting[name] = True
    try:
        response = ollama_delete("/api/delete", {"name": name})
        response.raise_for_status()
    except requests.RequestException as exc:
        _deleting.pop(name, None)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        _deleting.pop(name, None)

    return {"status": "deleted", "name": name}


INDEX_HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ollama Runtime</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0D0D1A;
      --surface: #161625;
      --surface-high: #1E1E30;
      --surface-bright: #26263A;
      --text: #F0ECF6;
      --text-muted: #A8A6B2;
      --text-dim: #6E6C7A;
      --primary: #76E22A;
      --primary-on: #0A2000;
      --tertiary: #00CEC9;
      --outline: rgba(255,255,255,0.06);
      --error: #FF6B6B;
      --warning: #FBBF24;
      --success: #34D399;
      --radius: 16px;
    }
    * { box-sizing: border-box; margin: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    .app { max-width: 960px; margin: 0 auto; padding: 24px 24px 64px; }

    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; padding: 0 0 24px; border-bottom: 1px solid var(--outline); margin-bottom: 24px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left img { width: 36px; height: 36px; border-radius: 10px; }
    .header-left h1 { font-family: 'Sora', sans-serif; font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em; }
    .header-links { display: flex; gap: 16px; }
    .header-links a { color: var(--text-dim); font-size: 0.82rem; font-weight: 500; text-decoration: none; transition: color 150ms; }
    .header-links a:hover { color: var(--text); }

    /* Status bar */
    .status-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    .status-item { flex: 1; min-width: 140px; background: var(--surface); border: 1px solid var(--outline); border-radius: var(--radius); padding: 14px 16px; }
    .status-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); margin-bottom: 6px; }
    .status-value { font-size: 0.88rem; font-weight: 600; word-break: break-all; }
    .status-value.online { color: var(--success); }
    .status-value.offline { color: var(--error); }
    .status-value.pending { color: var(--warning); }

    /* Section header */
    .section-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .section-title { font-family: 'Sora', sans-serif; font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em; }
    .section-header .pull-bar { flex: 1; min-width: 280px; }

    /* Pull bar */
    .pull-bar { display: flex; gap: 8px; margin-bottom: 20px; }
    .pull-bar input {
      flex: 1; padding: 10px 14px; background: var(--surface); border: 1px solid var(--outline);
      border-radius: 10px; color: var(--text); font-size: 0.88rem; font-family: inherit; outline: none;
      transition: border-color 150ms;
    }
    .pull-bar input::placeholder { color: var(--text-dim); }
    .pull-bar input:focus { border-color: rgba(118,226,42,0.3); }

    /* Buttons */
    .btn { padding: 8px 16px; border-radius: 10px; border: none; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 150ms; }
    .btn-primary { background: var(--primary); color: var(--primary-on); }
    .btn-primary:hover { opacity: 0.9; }
    .btn-outline { background: transparent; color: var(--text-muted); border: 1px solid var(--outline); }
    .btn-outline:hover { border-color: rgba(255,255,255,0.15); color: var(--text); }
    .btn-danger { background: rgba(255,107,107,0.1); color: var(--error); border: 1px solid rgba(255,107,107,0.15); }
    .btn-danger:hover { background: rgba(255,107,107,0.18); }
    .btn:disabled { opacity: 0.4; cursor: default; }

    /* Model list */
    .model-list { display: flex; flex-direction: column; gap: 8px; }
    .model-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: var(--surface); border: 1px solid var(--outline); border-radius: var(--radius); padding: 14px 16px;
      transition: border-color 150ms;
    }
    .model-row:hover { border-color: rgba(255,255,255,0.1); }
    .model-info { min-width: 0; }
    .model-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .model-meta { font-size: 0.78rem; color: var(--text-dim); }
    .model-actions { display: flex; gap: 6px; flex-shrink: 0; }

    /* Catalog grid */
    .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
    .catalog-card {
      background: var(--surface); border: 1px solid var(--outline); border-radius: var(--radius); padding: 16px;
      display: flex; flex-direction: column; gap: 10px; transition: border-color 150ms;
    }
    .catalog-card:hover { border-color: rgba(255,255,255,0.1); }
    .catalog-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .catalog-title { font-weight: 600; font-size: 0.9rem; }
    .catalog-desc { font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; }
    .catalog-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; }
    .catalog-meta { font-size: 0.75rem; color: var(--text-dim); }
    .tags { display: flex; gap: 4px; flex-wrap: wrap; }
    .tag { font-size: 0.7rem; padding: 3px 8px; border-radius: 6px; background: var(--surface-high); color: var(--text-dim); font-weight: 500; }
    .tag-loaded { background: rgba(52,211,153,0.12); color: var(--success); }

    /* Downloads */
    .download-item {
      background: var(--surface); border: 1px solid var(--outline); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 8px;
    }
    .download-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .download-name { font-weight: 600; font-size: 0.88rem; }
    .download-status { font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 6px; }
    .download-status.running { background: rgba(251,191,36,0.12); color: var(--warning); }
    .download-status.completed { background: rgba(52,211,153,0.12); color: var(--success); }
    .download-status.failed { background: rgba(255,107,107,0.12); color: var(--error); }
    .download-status.queued { background: var(--surface-high); color: var(--text-dim); }
    .progress-bar { height: 6px; border-radius: 3px; background: var(--surface-high); overflow: hidden; }
    .progress-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width 300ms ease; }
    .download-detail { font-size: 0.78rem; color: var(--text-dim); margin-top: 6px; }

    /* Row badges */
    .row-badge { display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; margin-left: 8px; vertical-align: middle; }
    .row-badge.loaded { background: rgba(52,211,153,0.12); color: var(--success); }
    .row-badge.downloading { background: rgba(251,191,36,0.12); color: var(--warning); }
    .downloading-card { border-color: rgba(251,191,36,0.2); }

    /* Empty state */
    .empty { text-align: center; padding: 32px 16px; color: var(--text-dim); font-size: 0.88rem; }

    @media (max-width: 640px) {
      .app { padding: 16px 16px 48px; }
      .header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .catalog-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <img src="/ollama-official.png" alt="Ollama">
        <h1>Ollama Runtime</h1>
      </div>
      <nav class="header-links">
        <a href="https://ollama.com/library" target="_blank" rel="noreferrer">Model Library</a>
        <a href="https://docs.ollama.com/" target="_blank" rel="noreferrer">Docs</a>
      </nav>
    </header>

    <div class="status-bar">
      <div class="status-item">
        <div class="status-label">Status</div>
        <div class="status-value" id="s-status">Checking...</div>
      </div>
      <div class="status-item">
        <div class="status-label">Endpoint</div>
        <div class="status-value" id="s-endpoint" style="color:var(--tertiary);font-size:0.8rem;">--</div>
      </div>
    </div>

    <div id="active-section"></div>

    <div class="section-header">
      <h2 class="section-title">Models</h2>
      <div class="pull-bar" style="margin-bottom:0">
        <input id="catalog-search" placeholder="Search or pull any model name...">
        <button class="btn btn-primary" id="manual-pull">Pull</button>
      </div>
    </div>
    <div class="catalog-grid" id="catalog-grid"></div>
  </div>

  <script>
    const S = { catalog: [], installed: [], downloads: [] }

    const $ = (s) => document.getElementById(s)
    const esc = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

    function fmtBytes(b) {
      if (!b) return '?'
      const u = ['B','KB','MB','GB','TB']
      let v = b, i = 0
      while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
      return v.toFixed(v >= 10 ? 0 : 1) + ' ' + u[i]
    }

    async function api(url, opts) {
      const r = await fetch(url, opts)
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Failed')
      return d
    }

    async function refreshRuntime() {
      try {
        const r = await api('/api/runtime')
        $('s-status').textContent = r.reachable ? 'Running v' + r.version : 'Unreachable'
        $('s-status').className = 'status-value ' + (r.reachable ? 'online' : 'offline')
        $('s-endpoint').textContent = r.shared_endpoint
      } catch(e) {
        $('s-status').textContent = 'Error'
        $('s-status').className = 'status-value offline'
      }
    }

    function renderActive() {
      const el = $('active-section')
      // Installed models + active downloads
      const activeDownloads = S.downloads.filter(j => j.status === 'running' || j.status === 'queued')
      if (!S.installed.length && !activeDownloads.length) { el.innerHTML = ''; return }

      let html = ''

      // Active downloads first
      activeDownloads.forEach(j => {
        const p = Math.max(0, Math.min(100, Number(j.progress||0)))
        const detail = j.total ? fmtBytes(j.completed) + ' / ' + fmtBytes(j.total) : (j.message || 'Starting...')
        html += `
        <div class="catalog-card downloading-card">
          <div class="catalog-header">
            <div>
              <div class="catalog-title">${esc(j.name)}</div>
              <div class="catalog-meta">Downloading...</div>
            </div>
            <button class="btn btn-outline" disabled>${Math.round(p)}%</button>
          </div>
          <div class="catalog-desc">${esc(detail)}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${p}%"></div></div>
          <div class="catalog-footer">
            <div class="tags"><span class="tag">downloading</span></div>
            <span class="catalog-meta"></span>
          </div>
        </div>`
      })

      // Installed models
      S.installed.forEach(m => {
        if (activeDownloads.some(j => j.name === m.name)) return
        const isDel = m.deleting
        const isLoaded = m.loaded
        let btn = ''
        if (isDel) btn = '<button class="btn btn-outline" disabled>Deleting...</button>'
        else btn = '<button class="btn btn-danger" data-del="' + esc(m.name) + '">Delete</button>'
        const desc = [m.family, m.parameter_size, m.quantization_level].filter(Boolean).join(' &middot; ')
        const tags = []
        if (isLoaded) tags.push('<span class="tag tag-loaded">loaded</span>')
        html += `
        <div class="catalog-card">
          <div class="catalog-header">
            <div>
              <div class="catalog-title">${esc(m.name)}</div>
              <div class="catalog-meta">${desc || 'Model'}</div>
            </div>
            ${btn}
          </div>
          <div class="catalog-desc">${esc(fmtBytes(m.size))}</div>
          <div class="catalog-footer">
            <div class="tags">${tags.join('')}</div>
            <span class="catalog-meta"></span>
          </div>
        </div>`
      })

      el.innerHTML = '<h2 class="section-title" style="margin-bottom:12px">Installed</h2><div class="catalog-grid">' + html + '</div><div style="margin-bottom:28px"></div>'

      el.querySelectorAll('[data-del]').forEach(b => {
        b.addEventListener('click', async () => {
          const n = b.getAttribute('data-del')
          if (!confirm('Delete ' + n + '?')) return
          b.disabled = true; b.textContent = 'Deleting...'
          try { await api('/api/models/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:n}) }); await refreshAll() }
          catch(e) { alert(e.message); b.disabled = false; b.textContent = 'Delete' }
        })
      })
    }

    function renderCatalog() {
      const q = $('catalog-search').value.trim().toLowerCase()
      const items = S.catalog.filter(m => !q || [m.name,m.title,m.summary,...(m.capabilities||[])].join(' ').toLowerCase().includes(q))
      const el = $('catalog-grid')
      el.innerHTML = items.map(m => {
        let btnClass, btnText, btnDisabled
        if (m.downloading) { btnClass = 'btn-outline'; btnText = Math.round(m.download_progress) + '%'; btnDisabled = true }
        else if (m.installed) { btnClass = 'btn-outline'; btnText = 'Installed'; btnDisabled = true }
        else { btnClass = 'btn-primary'; btnText = 'Pull'; btnDisabled = false }
        const progressHtml = m.downloading
          ? '<div class="progress-bar" style="margin-top:10px"><div class="progress-fill" style="width:' + Math.round(m.download_progress) + '%"></div></div>'
          : ''
        return `
        <div class="catalog-card">
          <div class="catalog-header">
            <div>
              <div class="catalog-title">${esc(m.title)}</div>
              <div class="catalog-meta">${esc(m.name)}</div>
            </div>
            <button class="btn ${btnClass}" data-pull="${esc(m.name)}" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
          </div>
          <div class="catalog-desc">${esc(m.summary)}</div>
          ${progressHtml}
          <div class="catalog-footer">
            <div class="tags">${(m.capabilities||[]).map(c => '<span class="tag">' + esc(c) + '</span>').join('')}</div>
            <span class="catalog-meta">${esc(m.size)}</span>
          </div>
        </div>`
      }).join('')
      el.querySelectorAll('[data-pull]').forEach(b => {
        b.addEventListener('click', async () => {
          b.disabled = true; b.textContent = 'Starting...'
          try { await api('/api/models/pull', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name: b.getAttribute('data-pull')}) }); await refreshAll() }
          catch(e) { alert(e.message); b.disabled = false; b.textContent = 'Pull' }
        })
      })
    }

    async function refreshAll() {
      const [m, c, d] = await Promise.all([api('/api/models'), api('/api/catalog'), api('/api/downloads')])
      S.installed = m.models || []
      S.catalog = c.models || []
      S.downloads = d.downloads || []
      renderActive(); renderCatalog()
      await refreshRuntime()
    }

    $('catalog-search').addEventListener('input', renderCatalog)
    $('manual-pull').addEventListener('click', async () => {
      const inp = $('catalog-search'), n = inp.value.trim()
      if (!n) return
      // If it looks like a model name (contains : or /), pull it; otherwise just search
      if (n.includes(':') || n.includes('/')) {
        try { await api('/api/models/pull', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:n}) }); inp.value = ''; await refreshAll() }
        catch(e) { alert(e.message) }
      }
    })
    $('catalog-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('manual-pull').click() })

    refreshAll()
    setInterval(refreshAll, 4000)
  </script>
</body>
</html>
"""
