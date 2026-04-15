# Pull Request Process

This document defines the recommended repository review and merge workflow for NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC.

## Branch Protection Recommendations

Apply these protections to `main`:

- require pull requests before merge
- require at least 1 approving review
- require review from code owners
- dismiss stale approvals when new commits are pushed
- require conversation resolution before merge
- block force pushes
- block branch deletion

## Review Expectations

- Backend changes should include backend validation notes.
- Frontend changes should include build status and manual UI verification notes.
- Recipe changes should identify the affected recipe(s) and any smoke-test evidence.
- Script or installer changes should specify operating system and shell validation.
- Governance and licensing changes should identify every synchronized document updated in the same pull request.

## Labels and Ownership

Use repository labels to help triage reviews:

- `backend`
- `frontend`
- `recipes`
- `scripts`
- `documentation`
- `governance`
- `licensing`
- `dependencies`

`CODEOWNERS` should be enabled together with branch protection so reviewer requests are assigned automatically.

For dependency and automation changes, keep explicit ownership entries for:

- `requirements.txt`
- `frontend/package.json`
- `frontend/package-lock.json`
- `.github/dependabot.yml`
- `.github/workflows/*.yml`

This helps dependency and workflow pull requests request review from the expected maintainers even when changes are narrowly scoped.

## Dependabot and Automation

- Keep dependency update pull requests small and easy to review.
- Prefer grouped review by ecosystem when several updates arrive at the same time.
- Use labels from `.github/labeler.yml` to route changes quickly.
- Rebase or refresh dependency pull requests before merging if they become stale.

### Optional GitHub Actions workflows

The repository includes additional workflow definitions that are intentionally disabled by default:

Active workflows that are not gated:

- `.github/workflows/pr-validation.yml`
- `.github/workflows/labeler.yml`
- `.github/workflows/optional-workflows-status.yml`

Gated workflows:

- `.github/workflows/ci-validation-disabled.yml`
- `.github/workflows/recipe-validation-disabled.yml`
- `.github/workflows/docs-governance-disabled.yml`
- `.github/workflows/dependency-updates-disabled.yml`
- `.github/workflows/dependabot-auto-triage-disabled.yml`
- `.github/workflows/release-package-disabled.yml`

These workflows do not execute their jobs unless the repository variable `ENABLE_OPTIONAL_WORKFLOWS` is set to `true`.

Dependency update pull requests are also staged conservatively: `.github/dependabot.yml` exists, but each ecosystem currently uses `open-pull-requests-limit: 0` so Dependabot does not open update pull requests until maintainers explicitly allow it.

Recommended usage:

- keep the variable unset during initial workflow rollout
- review the workflow contents and required permissions first
- enable the variable only when the repository is ready to run the optional automation set

## Merge Guidance

Prefer squash merges for routine changes unless preserving commit history is important for release or audit purposes.
