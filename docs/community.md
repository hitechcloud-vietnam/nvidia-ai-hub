# Community and Governance

This document is the central index for repository governance, contribution workflow, support guidance, and commercial-use policy.

## Core Documents

- Contribution guide: [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- Installation and deployment guide: [`./installation.md`](./installation.md)
- Production deployment guide: [`./deployment-production.md`](./deployment-production.md)
- Deployment example assets: `../deploy/systemd/`, `../deploy/nginx/`, `../deploy/caddy/`, `../deploy/pm2/`
- Local development guide: [`./local-development.md`](./local-development.md)
- Security policy: [`../SECURITY.md`](../SECURITY.md)
- Code of conduct: [`../CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md)
- Support guide: [`../SUPPORT.md`](../SUPPORT.md)
- Pull request process: [`./pull-request-process.md`](./pull-request-process.md)
- GitHub Actions rollout guide: [`./github-actions.md`](./github-actions.md)
- Repository maintenance guide: [`./maintenance.md`](./maintenance.md)
- License: [`../LICENSE`](../LICENSE)
- Commercial licensing: [`../COMMERCIAL-LICENSE.md`](../COMMERCIAL-LICENSE.md)
- Licensing guide: [`./licensing.md`](./licensing.md)
- Legal notice: [`./legal-notice.md`](./legal-notice.md)
- Notice: [`../NOTICE`](../NOTICE)

## Document Purpose Matrix

| Document | Primary use | Typical audience |
|---|---|---|
| `../CONTRIBUTING.md` | contribution workflow, local validation, submission expectations | contributors |
| `./installation.md` | platform support boundaries, installation, deployment prerequisites, Docker and NVIDIA runtime guidance | operators and contributors |
| `./deployment-production.md` | Linux production service layout, reverse proxy, TLS, LAN/public exposure guidance | operators and maintainers |
| `../deploy/*` | tracked deployment example files for service managers and reverse proxies | operators and maintainers |
| `./local-development.md` | cross-platform developer setup, backend/frontend workflow, local validation | contributors |
| `./pull-request-process.md` | review flow, branch protection, merge guidance | reviewers and maintainers |
| `./github-actions.md` | workflow inventory, rollout gating, automation enablement | maintainers |
| `./maintenance.md` | `CODEOWNERS`, labels, Dependabot, branch protection maintenance | maintainers |
| `../SECURITY.md` | vulnerability reporting and disclosure process | reporters and maintainers |
| `../CODE_OF_CONDUCT.md` | collaboration and behavior expectations | all participants |
| `../SUPPORT.md` | support routing and usage questions | users and triagers |
| `./licensing.md` | licensing model and commercial-use interpretation | users and maintainers |
| `./legal-notice.md` | trademark attribution, ownership notice, and legal naming clarification | users, maintainers, legal reviewers |

## When to Use What

### Use `CONTRIBUTING.md` for

- local development workflow
- contribution expectations
- recipe submission guidance
- pull request validation checklist

### Use `installation.md` for

- Linux deployment workflow
- Windows and macOS platform boundaries
- Docker, NVIDIA driver, and NVIDIA Container Toolkit prerequisites
- optional PM2 process management

### Use `deployment-production.md` for

- `systemd` service setup
- optional PM2 persistence for Linux source deployments
- reverse proxy examples with Nginx or Caddy
- TLS, LAN, and public exposure notes

### Use `local-development.md` for

- backend and frontend setup from source
- cross-platform developer commands
- production-style local build validation
- Docker-backed validation during development

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

### Use `legal-notice.md` for

- consolidated trademark attribution
- ownership and naming clarification
- no-endorsement wording
- legal review references for documentation and distribution

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
- `docs/licensing.md`
- `docs/legal-notice.md`
- `.github/CODEOWNERS`
- `.github/dependabot.yml`
- `.github/labeler.yml`
- `.github/workflows/*.yml`
- issue and pull request templates

When changing governance or licensing language, update all affected documents in the same pull request.

Trademark attribution should remain consistent across `README.md`, `NOTICE`, `LICENSE`, `COMMERCIAL-LICENSE.md`, `docs/licensing.md`, and `docs/legal-notice.md`, especially where NVIDIA compatibility, branding, or company ownership language is presented.
