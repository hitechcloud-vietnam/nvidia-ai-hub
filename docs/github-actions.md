# GitHub Actions Rollout Guide

This document describes the optional GitHub Actions workflows staged for NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC.

## Current State

The repository includes workflow files under `.github/workflows/`, but the newly added optional workflows are gated by a repository variable.

They are intentionally present but inactive by default.

The repository also includes `.github/workflows/optional-workflows-status.yml`, which can run safely even while the gated workflows remain disabled. It reports whether `ENABLE_OPTIONAL_WORKFLOWS` is currently enabled.

## Gated Workflows

The following workflows are currently staged behind the repository variable `ENABLE_OPTIONAL_WORKFLOWS`:

- `.github/workflows/ci-validation-disabled.yml`
- `.github/workflows/recipe-validation-disabled.yml`
- `.github/workflows/docs-governance-disabled.yml`
- `.github/workflows/release-package-disabled.yml`

Each workflow contains job-level gating:

- jobs run only when `vars.ENABLE_OPTIONAL_WORKFLOWS == 'true'`
- if the variable is unset or has any other value, the workflow file remains effectively disabled

## Workflow Purposes

### CI validation

`ci-validation-disabled.yml` is intended to validate core application changes:

- install backend dependencies from `requirements.txt`
- install frontend dependencies with `npm ci`
- run `python -m compileall daemon`
- run `npm run lint`
- run `npm run build`

### Recipe validation

`recipe-validation-disabled.yml` is intended to validate recipe and script changes:

- parse every `registry/recipes/*/recipe.yaml`
- verify required metadata fields are present
- verify the recipe `slug` matches the parent folder name
- run `bash -n` against shell scripts under `registry/` and `scripts/`

### Docs and governance validation

`docs-governance-disabled.yml` is intended to validate repository documentation integrity:

- verify required governance files exist
- verify local Markdown links resolve correctly

### Release package build

`release-package-disabled.yml` is intended to prepare a reusable source bundle:

- install backend and frontend dependencies
- build the frontend production bundle
- create a compressed source archive
- upload the archive as a workflow artifact

## How to Enable

To enable the staged workflows:

1. Open the repository on GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Create or update the repository variable `ENABLE_OPTIONAL_WORKFLOWS`.
4. Set the value to `true`.

To disable them again, delete the variable or set it to a value other than `true`.

You can use the `Optional Workflows Status` workflow to confirm the current variable state from the GitHub Actions UI.

## Recommended Rollout Order

Use a gradual rollout:

1. enable `ci-validation-disabled.yml`
2. enable `docs-governance-disabled.yml`
3. enable `recipe-validation-disabled.yml`
4. enable `release-package-disabled.yml`

This order reduces risk by activating low-impact validation first and artifact packaging last.

## Permissions Review

Before enabling the workflows, review the permissions used by each file.

Current design goals:

- default to `contents: read`
- avoid elevated repository write permissions unless operationally required
- keep artifact upload limited to the release packaging workflow

Existing workflows such as PR body validation and label application remain separate from this staged set.

## Reviewer Guidance

When a pull request changes workflow files, reviewers should confirm:

- the workflow scope matches the files it watches
- dependency installation steps match the current project layout
- required tool versions remain aligned with project docs
- permissions stay minimal
- gated workflows are not enabled accidentally

## Validation Expectations

When updating staged workflows, capture validation evidence in the pull request:

- YAML file review completed
- affected documentation updated
- local command equivalents run when practical
- any untested GitHub-hosted behavior called out explicitly

## Notes

These workflow files are intended to support controlled repository automation rollout.

They should remain gated until maintainers are ready to absorb the operational cost of running them on pull requests, pushes, or tags.
