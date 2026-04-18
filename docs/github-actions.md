# GitHub Actions Rollout Guide

This document describes the staged automation model for this repository.

## 1. Current automation state

The repository contains active workflows and staged workflows.

### Active workflows

- `.github/workflows/pr-validation.yml`
- `.github/workflows/labeler.yml`
- `.github/workflows/optional-workflows-status.yml`

### Staged workflows

These remain gated by `ENABLE_OPTIONAL_WORKFLOWS`:

- `.github/workflows/ci-validation-disabled.yml`
- `.github/workflows/recipe-validation-disabled.yml`
- `.github/workflows/docs-governance-disabled.yml`
- `.github/workflows/release-package-disabled.yml`
- `.github/workflows/desktop-build-disabled.yml`
- `.github/workflows/dependency-updates-disabled.yml`
- `.github/workflows/dependabot-auto-triage-disabled.yml`

### Paused dependency automation

- `.github/dependabot.yml`

Dependabot is configured but paused through `open-pull-requests-limit: 0`.

## 2. What the staged workflows are for

### CI validation

Intended to run core backend and frontend validation:

- backend dependency install
- `python -m compileall daemon`
- frontend dependency install
- `npm run lint`
- `npm run build`

### Recipe validation

Intended to validate recipe and shell-script structure.

### Docs and governance validation

Intended to validate required docs and internal Markdown links.

This should include core governance, planning, and legal-reference materials such as `README.md`, `docs/community.md`, `docs/licensing.md`, `docs/legal-notice.md`, and the tracked `planning/` documents.

### Release packaging

Intended to build a source bundle with a production frontend artifact.

### Desktop packaging

Intended to build Electron desktop artifacts for Windows, macOS, and Linux.

The staged desktop workflow currently:

- installs Node.js and Python on each hosted runner
- installs frontend dependencies with `npm ci`
- builds the frontend bundle
- generates Windows, macOS, and Linux desktop icons from the tracked brand SVG
- assembles a local backend runtime for Electron packaging
- creates platform-specific desktop artifacts through `electron-builder`
- uploads generated installer or bundle artifacts for review

Hosted signing, notarization, and native Linux package validation are not configured yet and should be treated as follow-up rollout work.

Before promoting desktop packaging to an official release workflow, provision platform secrets and certificates explicitly:

- Windows signing: `CSC_LINK`, `CSC_KEY_PASSWORD`, and optional `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD`
- macOS signing: `CSC_LINK`, `CSC_KEY_PASSWORD`, `CSC_NAME`
- macOS notarization: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`

Local or hosted packaging can also fail when Electron's downloaded binary cache is incomplete or upstream mirrors return transient `504` responses. Re-running `npm install` in `frontend/` repairs a missing `node_modules/electron/path.txt` because the `postinstall` hook now re-checks the Electron runtime before packaging.

### Dependency update validation

Intended to validate dependency and workflow automation changes.

### Dependabot auto-triage

Intended to label and guide Dependabot pull requests after maintainers intentionally enable dependency pull requests.

## 3. Enablement model

Staged workflows run only when the repository variable `ENABLE_OPTIONAL_WORKFLOWS` is set to `true`.

If the variable is missing or has another value, the staged jobs remain effectively disabled.

## 4. Recommended rollout order

1. review `.github/dependabot.yml`
2. enable CI validation
3. enable docs and governance validation
4. enable recipe validation
5. enable dependency update validation
6. enable Dependabot auto-triage
7. enable release packaging
8. enable desktop packaging

This order keeps lower-risk validation ahead of heavier automation.

## 5. Permissions guidance

Before enabling or changing workflows, verify:

- permissions remain minimal
- workflow scope matches watched files
- tool versions remain aligned with project docs
- staged workflows are not enabled accidentally

## 6. Pull request expectation for workflow changes

When a pull request changes workflow files, include:

- what changed
- whether the workflow remains gated
- any permission changes
- any local equivalent validation performed
- any untested GitHub-hosted behavior

If workflow changes alter validation expectations for backend, frontend, recipes, docs, or governance, review the linked contributor guidance in [`../CONTRIBUTING.md`](../CONTRIBUTING.md), [`pull-request-process.md`](./pull-request-process.md), and the active execution priorities in [`../planning/development-execution-plan.md`](../planning/development-execution-plan.md).
