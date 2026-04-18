# Pull Request Process

This document defines the expected review and merge workflow.

## 1. Pull request scope

Prefer pull requests that stay within one main concern:

- backend
- frontend
- recipes
- scripts and installer behavior
- documentation and governance
- dependency or workflow maintenance

If a pull request crosses areas, explain why the changes must land together.

## 2. Review expectations

### Backend

- include backend validation notes
- identify affected API paths, startup flow, or runtime behavior

### Frontend

- include `npm run lint`
- include `npm run build`
- include a short manual verification summary

### Recipes

- list the exact recipe slugs changed
- state whether validation was smoke-tested or metadata-only

### Scripts and installer changes

- state the operating system and shell used for validation
- clearly note when behavior was reviewed statically rather than executed

### Documentation and governance

- identify the synchronized files updated together
- note any reviewer risk where behavior could not be exercised directly

## 3. Branch protection recommendation

Recommended protection for `main`:

- require pull requests before merge
- require at least one approval
- require code owner review
- dismiss stale approvals on new commits
- require conversation resolution before merge
- block force pushes
- block branch deletion

## 4. Labels and ownership

Recommended labels:

- `backend`
- `frontend`
- `recipes`
- `scripts`
- `documentation`
- `governance`
- `licensing`
- `dependencies`

`CODEOWNERS` should remain aligned with the repository structure so reviewers are requested automatically.

## 5. Automation and dependency updates

- keep dependency pull requests small and reviewable
- refresh stale dependency branches before merge
- keep workflow permissions minimal
- use [`maintenance.md`](./maintenance.md) and [`github-actions.md`](./github-actions.md) when touching repository automation

Staged workflows remain gated by `ENABLE_OPTIONAL_WORKFLOWS`. Dependabot remains paused until maintainers raise `open-pull-requests-limit`.

## 6. Related document review

When changing install, runtime, or deployment behavior, review and update as needed:

- [`installation.md`](./installation.md)
- [`local-development.md`](./local-development.md)
- [`deployment-production.md`](./deployment-production.md)
- [`README.md`](../README.md)

## 7. Merge guidance

Prefer squash merge for routine changes unless preserving commit history is important for audit or release reasons.
