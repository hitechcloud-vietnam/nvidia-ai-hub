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

### Release packaging

Intended to build a source bundle with a production frontend artifact.

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
