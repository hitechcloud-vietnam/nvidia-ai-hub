# Community and Governance

This document is the central index for repository governance, contribution workflow, support guidance, and commercial-use policy.

## Core Documents

- Contribution guide: [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- Security policy: [`../SECURITY.md`](../SECURITY.md)
- Code of conduct: [`../CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md)
- Support guide: [`../SUPPORT.md`](../SUPPORT.md)
- Pull request process: [`./pull-request-process.md`](./pull-request-process.md)
- GitHub Actions rollout guide: [`./github-actions.md`](./github-actions.md)
- Repository maintenance guide: [`./maintenance.md`](./maintenance.md)
- License: [`../LICENSE`](../LICENSE)
- Commercial licensing: [`../COMMERCIAL-LICENSE.md`](../COMMERCIAL-LICENSE.md)
- Licensing guide: [`./licensing.md`](./licensing.md)
- Notice: [`../NOTICE`](../NOTICE)

## When to Use What

### Use `CONTRIBUTING.md` for

- local development workflow
- contribution expectations
- recipe submission guidance
- pull request validation checklist

### Use `github-actions.md` for

- active workflow inventory
- gated workflow inventory
- staged automation rollout guidance
- `ENABLE_OPTIONAL_WORKFLOWS` enablement notes

### Use `maintenance.md` for

- `CODEOWNERS` maintenance
- label routing maintenance
- Dependabot maintenance state
- branch protection maintenance checklist

### Use `SECURITY.md` for

- private security reporting
- disclosure expectations
- safe handling of vulnerabilities

### Use `CODE_OF_CONDUCT.md` for

- expected collaboration behavior
- review professionalism
- unacceptable conduct and enforcement expectations

### Use `SUPPORT.md` for

- usage questions
- bug reporting guidance
- support triage expectations
- commercial support boundary clarification

### Use `LICENSE` and `COMMERCIAL-LICENSE.md` for

- non-commercial use rights
- commercial restrictions
- licensing boundary clarification
- commercial permission path

## Discussions, Issues, and Support Routing

If GitHub Discussions is enabled, use it for:

- usage questions
- setup help
- roadmap ideas
- broader community conversations

Use GitHub Issues for:

- actionable bugs
- documentation defects
- reproducible regressions
- concrete feature requests
- recipe submission proposals

Use private reporting, not public issues, for security concerns.

## Attribution and Governance Notes

Repository governance and licensing should remain consistent across:

- `README.md`
- `NOTICE`
- `LICENSE`
- `COMMERCIAL-LICENSE.md`
- `.github/CODEOWNERS`
- `.github/dependabot.yml`
- `.github/labeler.yml`
- `.github/workflows/*.yml`
- issue and pull request templates

When changing governance or licensing language, update all affected documents in the same pull request.
