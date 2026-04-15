# NVIDIA AI Hub — Project Blueprint
## A Docker-Native AI App Launcher for NVIDIA DGX Spark

---

## 1. Vision & Positioning

**One-liner:** NVIDIA AI Hub is the missing app store for DGX Spark — a web-based launcher that turns community-verified Docker recipes into one-click AI workloads.

**The gap it fills:**
- Pinokio (the leading AI app launcher) is broken on DGX GPU due to ARM64 or AMD64 incompatibility
- NVIDIA Sync's "Custom Scripts" proves the UX is possible but has no catalog, no community sharing, no versioning
- NVIDIA's official playbooks are great but manual — copy-paste terminal commands
- The DGX Spark community is scattered across forum threads, GitHub repos, Medium posts, and gists
- Users are paying $4,000 for a machine that requires Docker expertise to use beyond the basics

**NVIDIA AI Hub unifies all of this** into a browsable catalog with one-click deploy.

---

## 2. Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│              (laptop/desktop via network)                │
│                                                         │
│   ┌───────────────────────────────────────────────────┐ │
│   │           NVIDIA AI Hub Web UI (React)                │ │
│   │                                                    │ │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │ │
│   │  │ Catalog   │ │ Running  │ │ System Monitor   │  │ │
│   │  │ (Browse & │ │ Apps     │ │ (GPU/RAM/Disk)   │  │ │
│   │  │  Search)  │ │ (Manage) │ │                  │  │ │
│   │  └──────────┘ └──────────┘ └──────────────────┘  │ │
│   └───────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/WebSocket
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   DGX SPARK or NVIDIA GPU DEVICE                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │        NVIDIA AI Hub Daemon (Python/FastAPI)          │  │
│  │                                                     │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │ Recipe       │  │ Docker       │  │ System    │ │  │
│  │  │ Registry     │  │ Orchestrator │  │ Monitor   │ │  │
│  │  │ (Git-backed) │  │ (compose)    │  │ (nvidia-  │ │  │
│  │  │              │  │              │  │  smi, df) │ │  │
│  │  └─────────────┘  └──────┬───────┘  └───────────┘ │  │
│  └───────────────────────────┼────────────────────────┘  │
│                              │                            │
│  ┌───────────────────────────▼────────────────────────┐  │
│  │              Docker Engine + NVIDIA Runtime         │  │
│  │                                                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ Open     │ │ ComfyUI  │ │ Hunyuan  │  ...      │  │
│  │  │ WebUI    │ │ +SageAttn│ │ 3D 2.1   │           │  │
│  │  │ +Ollama  │ │ +Wan2.2  │ │          │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │     NVIDIA GPU (128GB Unified Memory++) + 4TB NVMe     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Web UI, not desktop app** — Runs on the Spark itself, accessed via browser from any device. No Electron, no ARM64 GUI compatibility issues. Works with NVIDIA Sync's port forwarding naturally.

2. **Docker-compose recipes, not pip/conda scripts** — Docker containers encapsulate the ARM64+CUDA13 fixes. A recipe is a `docker-compose.yml` + metadata, not a fragile installation script. This is the single most important architectural decision.

3. **Git-backed recipe registry** — Recipes are stored in a GitHub repo. The daemon pulls updates. Community contributors submit PRs. Versioned, auditable, forkable.

4. **Lightweight daemon** — A single Python process (FastAPI) running on the Spark. No heavy dependencies. Communicates with Docker via the Docker SDK for Python. Exposes a REST API + WebSocket for live logs.

5. **NVIDIA Sync integration** — Generates compatible Custom Script entries that users can import, so apps also appear in NVIDIA Sync's launcher.

---

## 3. Recipe Format

A recipe is a directory in the registry repo:

```
recipes/
├── hunyuan3d-2.1/
│   ├── recipe.yaml            # Metadata
│   ├── docker-compose.yml     # The actual deployment
│   ├── Dockerfile             # Optional: custom build
│   ├── scripts/
│   │   └── launch.sh          # NVIDIA Sync custom script
│   ├── screenshot.png         # Preview image
│   └── README.md              # Detailed docs
├── comfyui-sparky/
│   ├── recipe.yaml
│   ├── docker-compose.yml
│   └── ...
└── ...
```

### recipe.yaml Schema

```yaml
name: "Hunyuan3D 2.1"
slug: hunyuan3d-2.1
version: "1.0.0"
description: "Text/Image to 3D model generation with full PBR texturing"
author: "dr-vij"
upstream: "https://github.com/Tencent/Hunyuan3D-2"
fork: "https://github.com/dr-vij/Hunyuan3D-2.1-DGX-Docker"

category: "3d-generation"           # Enum: llm, image-gen, video-gen, 
                                     # 3d-generation, audio, coding, 
                                     # multi-modal, tools
tags:
  - "3d"
  - "texturing"
  - "mesh"

# Hardware requirements
requirements:
  min_memory_gb: 40                  # Minimum RAM needed
  recommended_memory_gb: 80          # For best performance
  disk_gb: 50                        # Approximate disk footprint
  cuda_compute: "12.1"               # sm_121 (Blackwell GB10)
  
# What the user sees
ui:
  type: "gradio"                     # gradio | web | api-only | cli
  port: 7860
  path: "/"
  
# Container config
docker:
  build: true                        # Needs docker build (vs. pull)
  build_time_minutes: 30             # Estimated build time
  gpu: true
  
# Verification status
status: "community-verified"         # community-verified | official | 
                                     # experimental | broken
tested_on:
  dgx_os: "7.2"
  date: "2025-12-01"
  tester: "dr-vij"
  
# Dependencies on other recipes (optional)
depends_on: []

# Model downloads (shown to user before install)
models:
  - name: "Hunyuan3D-2.1 weights"
    size_gb: 25
    auto_download: true
```

---

## 4. Tech Stack

### Backend (runs on DGX Spark)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | Python 3.12 | Pre-installed on DGX OS, ecosystem |
| Framework | FastAPI + Uvicorn | Async, WebSocket support, lightweight |
| Docker SDK | `docker` (Python) | Official Docker SDK, compose support |
| Process mgmt | systemd service | Native to DGX OS, auto-restart |
| Data store | SQLite | Zero config, single-file, sufficient for metadata |
| Recipe sync | GitPython / subprocess git | Pull from registry repo |

### Frontend (served by backend, runs in browser)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | React 19 + Vite | Modern, fast, good ecosystem |
| Styling | Tailwind CSS | Utility-first, no build complexity |
| State | Zustand | Lightweight, no boilerplate |
| Real-time | WebSocket (native) | Live container logs, build progress |
| Charts | Recharts | GPU/memory monitoring |

### Registry (GitHub repo)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Hosting | GitHub | Free, PRs for contributions, Actions for CI |
| CI | GitHub Actions | Auto-validate recipe.yaml, test compose files |
| Images | GitHub Container Registry | Free for public repos, ARM64 support |

---

## 5. Core Features (MVP)

### Phase 1: Foundation (4-6 weeks)

**P1.1 — Recipe Catalog & Browser**
- Browse recipes by category (LLM, Image Gen, Video Gen, 3D, Audio, Coding)
- Search and filter
- Recipe detail page: description, screenshots, requirements, build time estimate
- Memory check: warn if a recipe needs more RAM than currently available

**P1.2 — One-Click Install & Launch**
- Click "Install" → daemon pulls images / builds containers
- Live build log stream via WebSocket
- Progress bar with estimated time
- Click "Launch" → starts containers, opens UI in new tab
- Click "Stop" → graceful container shutdown

**P1.3 — Running Apps Dashboard**
- List of currently running containers with status
- Port mapping display (click to open in browser)
- Per-container resource usage (GPU%, memory)
- Stop / Restart / Remove controls

**P1.4 — System Monitor**
- GPU utilization (from `nvidia-smi`)
- Memory usage breakdown (total, used by containers, available)
- Disk space (especially important with large models)
- Temperature

### Phase 2: Community (weeks 6-10)

**P2.1 — Recipe Updates**
- Check for recipe updates (git pull)
- Show changelog
- One-click update (rebuild container with new recipe)

**P2.2 — NVIDIA Sync Export**
- Generate NVIDIA Sync Custom Script entry for any installed app
- Copy-paste or auto-configure via SSH

**P2.3 — Model Manager**
- Shared model storage directory (`~/spark-ai-hub/models/`)
- Mount into containers via bind mounts
- Browse downloaded models
- Download models from Hugging Face / Ollama registry
- Prevent duplicate downloads across recipes

**P2.4 — Community Contributions**
- "Submit Recipe" flow → generates PR on GitHub
- Recipe rating / "verified on my Spark" button
- Comments / tips per recipe (stored in registry repo as YAML)

### Phase 3: Power User (weeks 10-14)

**P3.1 — Compose Editor**
- Edit docker-compose.yml for any recipe in-browser
- Environment variable overrides (e.g., change model, port)
- Save as "my fork" of a recipe

**P3.2 — Multi-Spark Support**
- Detect paired Spark (via QSFP)
- Deploy distributed recipes across two Sparks (e.g., vLLM with tensor parallelism)

**P3.3 — Backup & Restore**
- Export installed apps + model list
- Restore on fresh Spark

---

## 6. Installation of NVIDIA AI Hub Itself

The tool must be trivially installable. One command:

```bash
curl -fsSL https://spark-ai-hub.dev/install.sh | bash
```

What this does:
1. Creates `~/spark-ai-hub/` directory
2. Clones the NVIDIA AI Hub daemon + frontend (pre-built)
3. Clones the recipe registry
4. Installs a systemd service (`spark-ai-hub.service`)
5. Starts the service on port 9000
6. Prints: "NVIDIA AI Hub is running at http://localhost:9000"

No pip, no conda, no node — the daemon is a single Python file with vendored dependencies, and the frontend is pre-built static files.

---

## 7. Project Structure

```
spark-ai-hub/
├── daemon/                          # Backend
│   ├── main.py                      # FastAPI app entry
│   ├── routers/
│   │   ├── recipes.py               # CRUD for recipes
│   │   ├── containers.py            # Docker operations
│   │   ├── system.py                # nvidia-smi, disk, etc.
│   │   └── models.py                # Model management
│   ├── services/
│   │   ├── docker_service.py        # Docker SDK wrapper
│   │   ├── registry_service.py      # Git operations
│   │   ├── monitor_service.py       # System metrics
│   │   └── sync_export.py           # NVIDIA Sync integration
│   ├── models/                      # Pydantic schemas
│   │   ├── recipe.py
│   │   └── container.py
│   ├── db.py                        # SQLite
│   └── config.py                    # Settings
├── frontend/                        # React app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Catalog.jsx
│   │   │   ├── AppDetail.jsx
│   │   │   ├── Running.jsx
│   │   │   └── System.jsx
│   │   ├── components/
│   │   │   ├── RecipeCard.jsx
│   │   │   ├── BuildLog.jsx
│   │   │   ├── ResourceMonitor.jsx
│   │   │   └── ...
│   │   └── App.jsx
│   └── dist/                        # Pre-built for distribution
├── registry/                        # Git submodule → recipe repo
│   └── recipes/
│       ├── ollama-openwebui/
│       ├── comfyui-sparky/
│       ├── hunyuan3d-2.1/
│       ├── trellis2/
│       ├── lm-studio/
│       ├── localai/
│       ├── vllm-community/
│       └── ...
├── install.sh                       # One-line installer
├── spark-ai-hub.service               # systemd unit
└── README.md
```

---

## 8. Initial Recipe Catalog (Launch Day)

| Recipe | Category | Source | Status | Build Time |
|--------|----------|--------|--------|------------|
| Ollama + Open WebUI | LLM | NVIDIA Playbook | Official | < 5 min |
| LM Studio | LLM | lmstudio.ai | Official | < 2 min |
| ComfyUI (SparkyUI) | Image/Video Gen | ecarmen16/SparkyUI | Community | ~15 min |
| Hunyuan3D 2.1 | 3D Generation | dr-vij fork | Community | ~30 min |
| TRELLIS.2 | 3D Generation | raziel2001au fork | Community | ~20 min |
| LocalAI | Multi-modal API | mudler/LocalAI | Official | < 5 min |
| vLLM (sm_121 fork) | LLM Serving | seli-equinix fork | Community | ~25 min |
| TensorRT-LLM | LLM Serving | NVIDIA NGC | Official | < 10 min |
| llama.cpp (ggml) | LLM Serving | ggml-org guide | Community | ~10 min |
| Stable Diffusion WebUI | Image Gen | AUTOMATIC1111 | Community | ~15 min |

---

## 9. Differentiation vs. Alternatives

| Feature | Pinokio | NVIDIA Sync | NVIDIA Playbooks | NVIDIA AI Hub |
|---------|---------|-------------|-----------------|------------|
| Works on DGX Spark | ❌ | ✅ | ✅ | ✅ |
| One-click install | ✅ | ⚠️ Manual scripts | ❌ Copy-paste | ✅ |
| App catalog/discovery | ✅ | ❌ | ✅ (docs) | ✅ |
| Community contributions | ✅ | ❌ | ❌ | ✅ |
| Live build logs | ✅ | ❌ | ❌ | ✅ |
| System monitoring | ❌ | ✅ (Dashboard) | ❌ | ✅ |
| Model management | ❌ | ❌ | ❌ | ✅ |
| Docker-native | ❌ (pip/conda) | N/A | ✅ | ✅ |
| ARM64 + CUDA 13 | ❌ | ✅ | ✅ | ✅ |

---

## 10. Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| NVIDIA builds their own app store | Medium | Position as community-driven complement, not competitor. Integrate with their tools, don't replace them. Offer to merge if approached. |
| CUDA 13 ecosystem matures, reducing need | High (12-18mo) | Expand to other ARM64+NVIDIA devices (Jetson Orin, future Grace laptops). The launcher UX remains valuable even when pip works. |
| Recipe maintenance burden | High | Community-driven model with clear verification tiers. Automated CI testing. Mark recipes as "stale" after N months without test. |
| Small user base | Medium | Start with DGX Spark, plan for Jetson, Grace-Blackwell laptops, and any future NVIDIA ARM desktop devices. |
| Security concerns (running untrusted Docker) | Medium | Verification tiers (official / community-verified / experimental). All recipes are open-source. Audit trail via Git. |

---

## 11. Name & Branding Ideas

- **NVIDIA AI Hub** — Spark (DGX Spark) + Forge (building/crafting). Strong, memorable.
- **SparkHub** — Marketplace feel. Risk: too similar to DockerHub.
- **Ignite** — "Ignite your Spark." Clean but generic.
- **SparkStore** — Clear but Apple-ish.
- **Anvil** — Forge metaphor. Short.
- **Kindling** — What starts a spark. Clever.

---

## 12. Getting Started: First 2 Weeks

**Week 1: Backend skeleton**
- [ ] FastAPI app with Docker SDK integration
- [ ] Recipe YAML parser
- [ ] Endpoints: list recipes, install recipe (docker-compose up), stop, status
- [ ] WebSocket endpoint for live docker build logs
- [ ] nvidia-smi polling endpoint

**Week 2: Frontend MVP + first recipes**
- [ ] React app: catalog page, app detail page, running apps page
- [ ] Wire up to backend API
- [ ] Package 3-5 recipes (Open WebUI, ComfyUI/SparkyUI, Hunyuan3D, LocalAI, LM Studio)
- [ ] install.sh script
- [ ] Test end-to-end on actual DGX Spark

**Week 3-4: Polish & launch**
- [ ] System monitor page
- [ ] Error handling & recovery (failed builds, OOM, etc.)
- [ ] README, docs, screenshots
- [ ] Post to DGX Spark community forum
- [ ] GitHub repo public launch
