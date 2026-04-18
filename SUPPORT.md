# Support

This document explains where to ask questions, where to report defects, and how to route security or commercial requests.

## 1. Use the right channel

### GitHub Discussions

Use Discussions, when enabled, for:

- usage questions
- installation help
- environment guidance
- roadmap ideas
- architecture discussion
- recipe suggestions before implementation

### GitHub Issues

Use Issues for:

- reproducible defects
- installer or runtime failures
- frontend or backend regressions
- documentation inaccuracies
- recipe metadata or loading problems

### Security reports

Do **not** open public issues for vulnerabilities.

Follow [`SECURITY.md`](./SECURITY.md).

### Commercial requests

Commercial usage, delivery, managed service, consulting, or revenue-generating use requires separate written permission.

Use:

- [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md)
- [`LICENSE`](./LICENSE)
- [`docs/licensing.md`](./docs/licensing.md)
- [`docs/legal-notice.md`](./docs/legal-notice.md)

## 2. Before opening an issue

Review the relevant docs first:

- [`docs/installation.md`](./docs/installation.md)
- [`docs/local-development.md`](./docs/local-development.md)
- [`docs/deployment-production.md`](./docs/deployment-production.md)
- [`docs/community.md`](./docs/community.md)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`SECURITY.md`](./SECURITY.md) when security may be involved

If the request is about roadmap direction, feature sequencing, or registry expansion priorities, also review:

- [`planning/sparkdeck-project-blueprint.md`](./planning/sparkdeck-project-blueprint.md)
- [`planning/development-execution-plan.md`](./planning/development-execution-plan.md)
- [`planning/registry-expansion-roadmap.md`](./planning/registry-expansion-roadmap.md)

## 3. Include this information

Provide:

- operating system
- installation method or source workflow used
- Python, Node.js, and Docker versions when relevant
- exact commands used
- expected result
- actual result
- logs, stack traces, screenshots, or browser console output when relevant
- whether the issue is reproducible

## 4. Self-check steps

Linux or shell-based environments:

```bash
./check.sh
```

Source validation examples:

```bash
.venv/bin/python -m uvicorn daemon.main:app --host 127.0.0.1 --port 9000
cd frontend
npm run lint
npm run build
```

Windows PowerShell example:

```powershell
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --host 127.0.0.1 --port 9000
```

If you are on Windows or macOS, use the source workflow from [`docs/local-development.md`](./docs/local-development.md) instead of Linux shell script assumptions.

## 5. Support boundary

Support is best-effort unless a separate written commercial agreement states otherwise.

When reporting issues, be explicit about:

- whether the problem is from a Linux installer flow or a source-development flow
- whether Docker or GPU runtime validation was actually performed
- whether the issue occurs on Linux, Windows, or macOS
- whether the report is about runtime behavior, documentation wording, legal/licensing interpretation, or roadmap/planning expectations

## 6. Legal note

References to NVIDIA technologies in this repository are descriptive only and do not imply endorsement. For legal and licensing terms, use the files listed in the licensing section of [`README.md`](./README.md).

The short product name `NVIDIA AI Hub` and the detailed product name `NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC` refer to the same software solution unless a controlling written instrument expressly distinguishes them.

Questions about trademark attribution, no-endorsement wording, commercial boundary interpretation, or external publication should be routed through the legal and licensing documents before any public or customer-facing use.
