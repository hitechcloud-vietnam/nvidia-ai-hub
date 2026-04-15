# Repository Maintenance

This document describes the core repository maintenance controls for NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC.

## Scope

Use this guide when maintaining repository automation, review routing, and governance configuration.

It complements:

- [`./github-actions.md`](./github-actions.md)
- [`./pull-request-process.md`](./pull-request-process.md)
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- [`./community.md`](./community.md)

## Maintenance Areas

### CODEOWNERS

`/.github/CODEOWNERS` defines default review ownership for:

- backend files
- frontend files
- recipe and script assets
- governance and workflow files
- dependency management files

When review routing changes, update `CODEOWNERS` in the same pull request as the affected workflow, dependency, or governance change.

### Labels

`/.github/labeler.yml` maps changed paths to repository labels such as:

- `backend`
- `frontend`
- `recipes`
- `scripts`
- `documentation`
- `governance`
- `licensing`
- `dependencies`

Keep labels aligned with the current repository structure so pull requests are routed consistently.

### Dependabot

`/.github/dependabot.yml` stages automated dependency update pull requests for:

- Python dependencies in `/`
- frontend npm dependencies in `/frontend`
- GitHub Actions dependencies in `/`

Current default state:

- Dependabot is configured
- dependency update pull request creation is paused with `open-pull-requests-limit: 0`

When enabling an ecosystem, increase the limit only for the ecosystem that is ready for review.

### Optional workflows

The repository includes staged workflows under `/.github/workflows/` that remain gated by `ENABLE_OPTIONAL_WORKFLOWS`.

Current gated workflows:

- `ci-validation-disabled.yml`
- `recipe-validation-disabled.yml`
- `docs-governance-disabled.yml`
- `dependency-updates-disabled.yml`
- `dependabot-auto-triage-disabled.yml`
- `release-package-disabled.yml`

Current active workflow for rollout visibility:

- `optional-workflows-status.yml`

Review `docs/github-actions.md` before enabling any staged workflow.

Standard terminology in this repository:

- **staged**: present in the repository but not yet intended for broad operational use
- **gated**: workflow jobs run only when `ENABLE_OPTIONAL_WORKFLOWS == 'true'`
- **paused**: Dependabot configuration exists, but pull request creation is held by `open-pull-requests-limit: 0`

### Branch protection

Recommended branch protection for `main` should include:

- pull request required before merge
- approval required
- code owner review required
- stale approval dismissal after new commits
- conversation resolution required
- force-push blocked
- branch deletion blocked

## Maintenance Checklist

When changing repository maintenance controls, confirm:

- `CODEOWNERS` still matches the real file layout
- labels still map to the expected paths
- workflow permissions remain minimal
- optional workflows are still gated unless intentionally enabled
- Dependabot remains paused unless maintainers explicitly allow new update pull requests
- related docs were updated in the same pull request

## Reviewer Notes

For repository maintenance pull requests, include:

- affected maintenance area
- whether automation remains gated or paused
- any permission changes
- validation evidence for documentation or workflow edits
- any follow-up work intentionally deferred
