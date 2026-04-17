# Development Execution Plan

## Purpose
This plan turns the product blueprint into a practical delivery backlog for the current `nvidia-ai-hub` repository. It is meant to guide iterative implementation across backend, frontend, registry, installer, and operations workstreams.

## Current Repository Baseline
The repository already includes a usable foundation:

- `daemon/` provides a FastAPI backend for recipes, containers, system status, and persistence.
- `frontend/` provides a React + Vite UI for catalog browsing and operations.
- `registry/recipes/` already contains a broad set of Docker-based AI app recipes.
- `deploy/` includes reverse proxy and service examples for `systemd`, `nginx`, `caddy`, and `pm2`.
- `docs/` already covers installation, production deployment, local development, maintenance, governance, and pull request process.

The next stage should focus less on raw scaffolding and more on product hardening, operator confidence, recipe quality, and predictable release slices.

## 2026 Delivery Goals

### Goal 1 — Make the platform operationally reliable
Operators should be able to install, run, restart, and troubleshoot the hub without reading source code.

### Goal 2 — Raise recipe quality and consistency
Each recipe should have clear metadata, validation expectations, runtime notes, and better UX integration.

### Goal 3 — Improve user experience for discovery and launch
Users should understand hardware fit, exposed URLs, storage impact, and launch state before they click install.

### Goal 4 — Prepare the project for sustained community growth
Contributors should have a clearer roadmap, smaller implementation slices, and documented quality gates.

## Workstreams

## Workstream A — Backend Reliability
Focus area: `daemon/`, API contracts, orchestration safety, persistence, and health reporting.

### A1. Configuration hardening
- Normalize environment loading and defaults across `install.sh`, `run.sh`, `check.sh`, and `daemon/config.py`.
- Define a stable configuration reference for host, port, registry path, polling intervals, and retention settings.
- Add clearer startup errors for missing Docker, invalid registry paths, or unreadable data directories.

### A2. Container lifecycle robustness
- Ensure start, stop, restart, and remove flows are idempotent.
- Improve error messages when a recipe is partially installed or a compose project already exists.
- Separate recoverable runtime failures from fatal orchestration failures in API responses.

### A3. Data model maturity
- Review `daemon/models/` and persistence in `daemon/db.py` for upgrade safety.
- Add explicit migration planning for future SQLite schema evolution.
- Track install history, last launch time, and failure reason where useful.

### A4. System monitoring completeness
- Extend system status endpoints with clearer GPU, memory, disk, and service health summaries.
- Add degraded-state reporting when `nvidia-smi` or Docker data is unavailable.
- Standardize timestamp formats and polling intervals for frontend use.

## Workstream B — Frontend Product UX
Focus area: `frontend/src/`, usability, operator confidence, and state clarity.

### B1. Catalog clarity
- Improve category naming, filtering, and tag visibility.
- Highlight recipe status, hardware requirements, runtime type, and banner family more consistently.
- Add empty-state guidance for unsupported hardware, missing recipes, and failed registry loads.

### B2. Install and launch confidence
- Surface preflight checks before install.
- Show expected ports, disk impact, model downloads, and first-run notes before launch.
- Make failure states actionable with retry and troubleshooting hints.

### B3. Running apps dashboard
- Display app URL, container state, uptime, and health at a glance.
- Distinguish between starting, healthy, degraded, stopped, and failed states.
- Add quick access to logs and recipe-specific operational notes.

### B4. Operational polish
- Standardize loading states, toasts, and error handling.
- Reduce UI ambiguity around background setup, image pulls, and post-install readiness.
- Keep the UI fully compatible with the backend-served production build from `frontend/dist`.

## Workstream C — Registry and Recipe Quality
Focus area: `registry/recipes/`, metadata quality, maintainability, and validation.

### C1. Recipe metadata standardization
- Review category taxonomy against the registry expansion roadmap.
- Ensure recipes consistently declare requirements, UI properties, port behavior, and storage notes.
- Add stronger reviewer guidance for upstream source references and supported host expectations.

### C2. Validation policy per recipe
- Define a lightweight smoke-test checklist for recipe submissions.
- Record which recipes are verified, partially verified, or metadata-only.
- Flag recipes that require external credentials, large downloads, or manual upstream steps.

### C3. Shared recipe conventions
- Standardize `.env.example`, data mount layout, screenshots, and README expectations.
- Prefer reusable compose patterns for reverse proxies, persistent storage, and model caches.
- Identify families that should share banner assets and metadata templates.

### C4. Registry expansion execution
- Use `planning/registry-expansion-roadmap.md` as the sourcing plan.
- Add new entries in bounded batches rather than mass importing.
- Complete one category family at a time with matching docs and banner coverage.

## Workstream D — Installer and Deployment Experience
Focus area: installation flow, upgrade flow, Linux operations, and support boundaries.

### D1. Installer predictability
- Keep Linux as the primary deployment target.
- Improve failure messaging for dependency install, frontend build, and backend startup.
- Explicitly preserve or migrate local `.env` settings during updates.

### D2. Upgrade safety
- Document how existing deployments are updated without losing runtime data.
- Add a clear rollback note for failed upgrades.
- Verify service restarts and frontend rebuild behavior after repository updates.

### D3. Deployment profiles
- Define supported profiles such as local workstation, lab server, reverse-proxy production, and DGX-style shared host.
- Map each profile to required docs, ports, and service management guidance.
- Keep example configs in `deploy/` synchronized with real runtime expectations.

## Workstream E — Developer Experience and Quality Gates
Focus area: contributor velocity, reviewability, and consistent validation.

### E1. Pull request slicing
- Keep changes scoped to one concern when possible.
- Encourage separate pull requests for backend, frontend, recipe, and governance work unless tightly coupled.
- Use planning documents to define each implementation slice before coding starts.

### E2. Validation discipline
- Frontend changes: record `npm run build`, `npm run lint`, and brief manual verification notes.
- Backend changes: record startup validation, API checks, and runtime behavior checked.
- Recipe changes: record affected recipes and smoke-test or metadata-only status.
- Installer changes: record operating system and shell used.

### E3. Automation follow-up
- Expand optional GitHub Actions only after validation scope is stable.
- Prioritize lightweight checks for schema, build, and lint before heavier automation.
- Add automation gradually to avoid blocking contributors with noisy failures.

## Recommended Delivery Phases

## Phase 1 — Stability and clarity
Target: 2 to 3 weeks

Primary outcomes:
- Better backend error handling
- Clearer frontend failure states
- Consistent configuration handling
- First pass on recipe metadata quality rules

Suggested backlog:
1. Backend startup diagnostics cleanup
2. Frontend error/loading state pass
3. Shared configuration reference documentation
4. Recipe metadata audit for top-used entries

## Phase 2 — Launch confidence
Target: 2 to 4 weeks

Primary outcomes:
- Better install preflight information
- Improved running-app visibility
- Recipe README and `.env.example` normalization
- First bounded registry expansion batch

Suggested backlog:
1. Install preflight panel in UI
2. Running app health summary improvements
3. Top recipe README consistency pass
4. Batch 1 from the registry expansion roadmap

## Phase 3 — Operations maturity
Target: 3 to 4 weeks

Primary outcomes:
- Stronger deployment profile guidance
- Upgrade and rollback documentation
- More complete system monitoring signals
- Better contributor review paths

Suggested backlog:
1. Upgrade-safe install/update behavior review
2. Reverse proxy and service profile audit
3. System status API enrichment
4. Contributor checklist refresh for recipes and runtime changes

## Phase 4 — Scale and community readiness
Target: ongoing

Primary outcomes:
- More predictable recipe intake
- Safer optional automation rollout
- Structured roadmap communication
- Better issue-to-plan-to-PR traceability

Suggested backlog:
1. Batch-based recipe intake process
2. Optional workflow enablement plan
3. Planning index and roadmap publishing format
4. Maintainer triage labels and ownership refinements

## Immediate Next Slice
If development starts now, the best next implementation slice is:

1. Audit the current backend API error paths for recipe load, compose launch, and Docker connectivity.
2. Improve frontend handling for loading, degraded, and failed states in the catalog and running-app views.
3. Standardize the top 10 to 15 recipes with a consistent README and `.env.example` pattern.
4. Deliver Batch 1 of the registry expansion roadmap only after the metadata conventions are locked.

This sequence reduces churn because platform behavior becomes clearer before many new recipes are added.

## Suggested Backlog by Area

### Backend
- health endpoint expansion
- structured error payloads
- install history persistence
- recipe parse validation messages
- safer container cleanup flow

### Frontend
- richer recipe detail panels
- install preflight summary
- running apps state badges
- logs drawer or panel
- clearer unsupported-host messaging

### Registry
- category taxonomy cleanup
- banner family mapping
- README template alignment
- `.env.example` normalization
- metadata review checklist

### Docs and Ops
- deployment profile matrix
- upgrade and rollback guide
- troubleshooting decision tree
- validation checklist templates
- roadmap publication cadence

## Definition of Done for Future Slices
A slice should be considered complete only when:

- the changed area is documented or intentionally documented as unchanged
- validation notes are specific to the touched files
- frontend changes pass production build validation
- backend changes are exercised against a running API instance where applicable
- recipe changes identify exact recipes touched and their validation status
- deferred work is written down explicitly

## Risks to Manage
- Recipe growth may outpace metadata quality if batch intake is too aggressive.
- Frontend UX changes may hide backend problems unless API errors remain explicit.
- Installer improvements can create Linux-specific assumptions that must stay documented.
- Optional automation can become noisy if enabled before conventions stabilize.
- Broad planning without bounded slices can produce scattered PRs with unclear validation.

## Planning Maintenance Rules
- Update this file when a new phase starts or priorities change.
- Keep roadmap items grouped by deliverable, not by vague ideas.
- Split large initiatives into reviewable implementation slices before coding.
- Link future pull requests back to the exact workstream and phase they implement.

## Related Planning Documents
- `planning/sparkdeck-project-blueprint.md`
- `planning/registry-expansion-roadmap.md`
