# GitHub Actions Guide

This document describes the active automation model for this repository.

## 1. Current automation state

The repository contains active workflows for validation, packaging, and dependency automation.

### Active workflows

- `.github/workflows/pr-validation.yml`
- `.github/workflows/labeler.yml`
- `.github/workflows/optional-workflows-status.yml`
- `.github/workflows/ci-validation.yml`
- `.github/workflows/recipe-validation.yml`
- `.github/workflows/docs-governance.yml`
- `.github/workflows/dependency-updates.yml`
- `.github/workflows/dependabot-auto-triage.yml`
- `.github/workflows/release-package.yml`
- `.github/workflows/desktop-build.yml`
- `.github/workflows/release-publish.yml`

### Dependency automation

- `.github/dependabot.yml`

Dependabot is configured and active with bounded pull request limits.

## 2. What the workflows are for

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

This workflow uploads the source bundle as a GitHub Actions artifact for tagged and manually triggered builds.

### Desktop packaging

Intended to build Electron desktop artifacts for Windows, macOS, and Linux.

The desktop workflow currently:

- installs Node.js and Python on each hosted runner
- installs frontend dependencies with `npm ci`
- builds the frontend bundle
- generates Windows, macOS, and Linux desktop icons from the tracked brand SVG
- assembles a local backend runtime for Electron packaging
- creates platform-specific desktop artifacts through `electron-builder`
- uploads generated installer or bundle artifacts for review

On Windows, the workflow uses `npm run desktop:dist:win` so NSIS setup, portable, ZIP, and MSI outputs do not overwrite one another.

### Release publishing

Intended to publish release notes and packaged assets to a GitHub Release.

This workflow runs on `release: published` and can also be started manually.

It rebuilds the source bundle and desktop artifacts from the release tag, then uploads them to the matching GitHub Release.

Hosted signing, notarization, and native Linux package validation are not configured yet and should be treated as follow-up work.

If signing is added later, provision platform secrets and certificates explicitly:

- Windows signing: `CSC_LINK`, `CSC_KEY_PASSWORD`, and optional `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD`
- macOS signing: `CSC_LINK`, `CSC_KEY_PASSWORD`, `CSC_NAME`
- macOS notarization: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`

Local or hosted packaging can also fail when Electron's downloaded binary cache is incomplete or upstream mirrors return transient `504` responses. Re-running `npm install` in `frontend/` repairs a missing `node_modules/electron/path.txt` because the `postinstall` hook now re-checks the Electron runtime before packaging.

### Dependency update validation

Intended to validate dependency and workflow automation changes.

### Dependabot auto-triage

Intended to label and guide Dependabot pull requests after maintainers intentionally enable dependency pull requests.

## 3. Permissions guidance

Before enabling or changing workflows, verify:

- permissions remain minimal
- workflow scope matches watched files
- tool versions remain aligned with project docs
- workflow triggers stay intentionally scoped

## 4. Pull request expectation for workflow changes

When a pull request changes workflow files, include:

- what changed
- whether trigger scope or automation behavior changed
- any permission changes
- any local equivalent validation performed
- any untested GitHub-hosted behavior

If workflow changes alter validation expectations for backend, frontend, recipes, docs, or governance, review the linked contributor guidance in [`../CONTRIBUTING.md`](../CONTRIBUTING.md), [`pull-request-process.md`](./pull-request-process.md), and the active execution priorities in [`../planning/development-execution-plan.md`](../planning/development-execution-plan.md).
