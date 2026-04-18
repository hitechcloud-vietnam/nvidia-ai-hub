# Repository Maintenance

This guide is for maintainers updating repository controls, review routing, and staged automation.

## 1. Maintenance areas

### `CODEOWNERS`

Keep `/.github/CODEOWNERS` aligned with the real repository layout.

Update it when ownership changes for:

- backend files
- frontend files
- recipes and scripts
- governance and workflow files
- dependency management files

### Labels

Keep `/.github/labeler.yml` aligned with current paths and review categories.

Recommended label families include:

- `backend`
- `frontend`
- `recipes`
- `scripts`
- `documentation`
- `governance`
- `licensing`
- `dependencies`

### Dependabot

`/.github/dependabot.yml` exists but remains paused by default through `open-pull-requests-limit: 0`.

If enabling an ecosystem, raise the limit only for the ecosystem that is ready for review.

### Optional workflows

Staged workflows under `/.github/workflows/` remain gated by `ENABLE_OPTIONAL_WORKFLOWS`.

Review [`github-actions.md`](./github-actions.md) before enabling any staged workflow.

## 2. Standard terms

- **staged** — present in the repository but not yet intended for broad operational use
- **gated** — runs only when `ENABLE_OPTIONAL_WORKFLOWS == 'true'`
- **paused** — configuration exists but automatic pull request creation is intentionally suppressed

## 3. Branch protection

Recommended protection for `main`:

- require pull requests before merge
- require approval
- require code owner review
- dismiss stale approvals after new commits
- require conversation resolution
- block force pushes
- block branch deletion

## 4. Maintainer checklist

When changing repository maintenance controls, confirm:

- `CODEOWNERS` still matches the layout
- labels still route as intended
- workflow permissions remain minimal
- optional workflows stay gated unless intentionally enabled
- Dependabot stays paused unless intentionally enabled
- related docs are updated in the same pull request
- legal and trademark wording remains synchronized where applicable

## 5. Pull request notes for maintenance changes

Maintenance pull requests should include:

- affected control area
- whether automation remains gated or paused
- any permission changes
- validation evidence for workflow or documentation changes
- any deferred follow-up work
