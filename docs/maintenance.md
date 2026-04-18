# Repository Maintenance

This guide is for maintainers updating repository controls, review routing, and active automation.

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

`/.github/dependabot.yml` is active by default with bounded pull request limits.

Adjust limits per ecosystem only when review capacity changes.

### Repository workflows

Repository workflows under `/.github/workflows/` are active by default.

Review [`github-actions.md`](./github-actions.md) before changing workflow scope, permissions, or release behavior.

## 2. Standard terms

- **active** — enabled by default when workflow event and path filters match
- **bounded** — automation is enabled with limits sized for reviewer capacity
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
- workflow triggers stay scoped intentionally
- Dependabot limits stay aligned with reviewer capacity
- related docs are updated in the same pull request
- legal and trademark wording remains synchronized where applicable
- planning and roadmap references remain synchronized where applicable

## 5. Pull request notes for maintenance changes

Maintenance pull requests should include:

- affected control area
- whether automation scope or limits changed
- any permission changes
- validation evidence for workflow or documentation changes
- any deferred follow-up work

If the maintenance change affects repository policy language, documentation routing, or review workflow expectations, note whether `docs/community.md` and the `planning/` index documents were reviewed for consistency.
