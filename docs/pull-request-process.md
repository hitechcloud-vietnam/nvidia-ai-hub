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

## Dependabot and Automation

- Keep dependency update pull requests small and easy to review.
- Prefer grouped review by ecosystem when several updates arrive at the same time.
- Use labels from `.github/labeler.yml` to route changes quickly.
- Rebase or refresh dependency pull requests before merging if they become stale.

## Merge Guidance

Prefer squash merges for routine changes unless preserving commit history is important for release or audit purposes.
