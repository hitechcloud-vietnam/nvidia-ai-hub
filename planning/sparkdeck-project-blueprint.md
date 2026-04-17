# NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC — Project Blueprint
## A Docker-Native AI App Launcher for NVIDIA GPU Platforms

---

## 1. Vision & Positioning

**One-liner:** NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC is a web-based application launcher for NVIDIA GPU platforms that turns community-verified Docker recipes into one-click AI workloads across workstations, enterprise servers, and DGX environments.

**The gap it fills:**
- Existing AI app launchers are inconsistent across NVIDIA GPU environments, especially when users must juggle CUDA, drivers, Docker, and architecture-specific fixes.
- NVIDIA Sync's "Custom Scripts" proves the UX is possible but has no catalog, no community sharing, and no versioned recipe lifecycle.
- NVIDIA's official playbooks are valuable but still require manual cloning, environment setup, and terminal-heavy operations.
- The NVIDIA GPU community is fragmented across deployment guides, workstation tutorials, GitHub repos, forum threads, blog posts, and internal team notes.
- Teams invest heavily in NVIDIA GPU hardware but still need platform expertise to operationalize community AI stacks safely and repeatedly.

**NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC unifies these workflows** into a browsable catalog with one-click deployment, lifecycle controls, validation guardrails, and a clearer operational model for NVIDIA GPU environments.

**Target platform scope:**
- NVIDIA DGX platforms, including NVIDIA NVIDIA GPUs
- NVIDIA GPU workstations
- NVIDIA GPU servers and lab systems
- Linux hosts with supported NVIDIA GPUs and NVIDIA Container Toolkit

---

## 2. Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│              (laptop/desktop via network)                │
│                                                         │
│   ┌───────────────────────────────────────────────────┐ │
│   │ NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC UI    │ │
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
│      NVIDIA GPU WORKSTATION / SERVER / DGX PLATFORM HOST             │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC Daemon │  │
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
│  │ NVIDIA GPU(s) + local NVMe / shared storage / datasets │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Web UI, not desktop app** — Runs on the target host and is accessed through a browser from any device. No Electron packaging burden, no local GUI dependency, and no need to ship separate desktop clients for each NVIDIA GPU platform profile.

2. **Docker-compose recipes, not pip/conda scripts** — Containers encapsulate CUDA, driver expectations, architecture-specific patches, and service topology. A recipe is a `docker-compose.yml` plus metadata, not a fragile installation script.

3. **Git-backed recipe registry** — Recipes are stored in a GitHub repo. The daemon pulls updates. Community contributors submit PRs. Versioned, auditable, forkable.

4. **Lightweight daemon** — A single Python process (FastAPI) runs on the managed NVIDIA GPU host. It communicates with Docker through the Docker SDK for Python and exposes REST and WebSocket endpoints for lifecycle operations, health, and logs.

5. **Platform-aware integrations** — NVIDIA Sync integration remains available where relevant, while the core platform remains portable across workstation, server, lab, and DGX deployments.

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
  platforms:
    - name: "NVIDIA DGX platform"
      os: "DGX OS 7.2"
      arch: "arm64"
    - name: "NVIDIA GPU workstation or server"
      os: "Ubuntu 24.04"
      arch: "x86_64"
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

### Backend (runs on supported NVIDIA GPU hosts)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | Python 3.12 | Mature ecosystem, portable across supported Linux hosts |
| Framework | FastAPI + Uvicorn | Async, WebSocket support, lightweight |
| Docker SDK | `docker` (Python) | Official Docker SDK, compose support |
| Process mgmt | systemd service | Native to modern Linux distributions, auto-restart |
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
| Images | GitHub Container Registry | Free for public repos, supports both ARM64 and x86_64 |

---

## 5. Core Features (MVP)

### Phase 1: Foundation (4-6 weeks)

**P1.1 — Recipe Catalog & Browser**
- Browse recipes by category (LLM, Image Gen, Video Gen, 3D, Audio, Coding)
- Search and filter
- Recipe detail page: description, screenshots, requirements, build time estimate
- Hardware fit check: warn if a recipe exceeds currently available RAM, disk, GPU memory, or expected compute capability

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
- Multi-GPU topology awareness where available

### Phase 2: Community and Operations (weeks 6-10)

**P2.1 — Recipe Updates**
- Check for recipe updates (git pull)
- Show changelog
- One-click update (rebuild container with new recipe)

**P2.2 — Platform Integration Export**
- Generate NVIDIA Sync Custom Script entries where applicable
- Provide portable launch metadata for workstation, lab, server, and DGX environments
- Copy-paste or auto-configure via SSH where needed

**P2.3 — Model Manager**
- Shared model storage directory (`~/nvidia-ai-hub/models/`)
- Mount into containers via bind mounts
- Browse downloaded models
- Download models from Hugging Face / Ollama registry
- Prevent duplicate downloads across recipes

**P2.4 — Community Contributions**
- "Submit Recipe" flow → generates PR on GitHub
- Recipe rating / "verified on my system" button
- Comments / tips per recipe (stored in registry repo as YAML)

### Phase 3: Power User (weeks 10-14)

**P3.1 — Compose Editor**
- Edit docker-compose.yml for any recipe in-browser
- Environment variable overrides (e.g., change model, port)
- Save as "my fork" of a recipe

**P3.2 — Multi-Node / Multi-GPU Support**
- Detect host GPU inventory and topology
- Support distributed recipes across multiple GPUs or multiple NVIDIA hosts where networking and storage are configured
- Enable deployment profiles for single-GPU, multi-GPU, and clustered inference setups

**P3.3 — Backup & Restore**
- Export installed apps + model list
- Restore on a fresh supported NVIDIA GPU host

---

## 6. Installation of NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC

The tool must be trivially installable on a supported Linux system with Docker and NVIDIA Container Toolkit. One command:

```bash
curl -fsSL https://nvidia-ai-hub.dev/install.sh | bash
```

What this does:
1. Creates `~/nvidia-ai-hub/` directory
2. Clones the NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC daemon + frontend (pre-built)
3. Clones the recipe registry
4. Installs a systemd service (`nvidia-ai-hub.service`)
5. Starts the service on port 9000
6. Prints: "NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC is running at http://localhost:9000"

No pip, no conda, no node for end users in the ideal packaged flow — the daemon is distributed as a lightweight service and the frontend is served as pre-built static files.

---

## 7. Project Structure

```
nvidia-ai-hub/
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
├── nvidia-ai-hub.service               # systemd unit
└── README.md
```

---

## 8. Initial Reference Catalog (Launch Day)

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

| Feature | Pinokio | NVIDIA Sync | NVIDIA Playbooks | NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC |
|---------|---------|-------------|-----------------|------------|
| Works on NVIDIA GPU hosts | ❌ | ⚠️ Limited | ⚠️ Manual | ✅ |
| One-click install | ✅ | ⚠️ Manual scripts | ❌ Copy-paste | ✅ |
| App catalog/discovery | ✅ | ❌ | ✅ (docs) | ✅ |
| Community contributions | ✅ | ❌ | ❌ | ✅ |
| Live build logs | ✅ | ❌ | ❌ | ✅ |
| System monitoring | ❌ | ✅ (Dashboard) | ❌ | ✅ |
| Model management | ❌ | ❌ | ❌ | ✅ |
| Docker-native | ❌ (pip/conda) | N/A | ✅ | ✅ |
| ARM64 and x86_64 NVIDIA targets | ❌ | ⚠️ Partial | ⚠️ Manual | ✅ |

---

## 10. Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| NVIDIA builds their own app store | Medium | Position as community-driven complement, not competitor. Integrate with their tools, don't replace them. Offer to merge if approached. |
| CUDA ecosystem matures, reducing need | High (12-18mo) | Expand value beyond install automation into catalog governance, validation, observability, and reproducible operations across NVIDIA GPU fleets. |
| Recipe maintenance burden | High | Community-driven model with clear verification tiers. Automated CI testing. Mark recipes as "stale" after N months without test. |
| Small user base | Medium | Start with early NVIDIA GPU infrastructure adopters, then expand to broader workstation, lab, and server users who need reproducible GPU application deployment. |
| Security concerns (running untrusted Docker) | Medium | Verification tiers (official / community-verified / experimental). All recipes are open-source. Audit trail via Git. |

---

## 11. Name & Branding Ideas

- **NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC** — adopted product branding for this project.
- **GPUHub** — Broad platform coverage. Risk: generic.
- **Ignite** — Strong activation metaphor. Clean but generic.
- **LaunchPad** — Strong operational meaning. Risk: common term.
- **Anvil** — Forge metaphor. Short.
- **Kindling** — Signals fast startup and activation. Clever, but less infrastructure-oriented.

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
- [ ] Test end-to-end on at least one DGX-platform target and one standard NVIDIA GPU Linux host to validate cross-platform behavior

**Week 3-4: Polish & launch**
- [ ] System monitor page
- [ ] Error handling & recovery (failed builds, OOM, etc.)
- [ ] README, docs, screenshots
- [ ] Post to NVIDIA developer, enterprise AI, and DGX community channels
- [ ] GitHub repo public launch
