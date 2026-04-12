# Support

## Purpose

This document explains where to ask questions, where to report problems, and how to request commercial assistance for `spark-ai-hub`.

## Support Channels

### Questions and Usage Help

Use GitHub Discussions when repository Discussions are enabled.

Good fit for Discussions:

- installation questions
- environment setup help
- usage guidance
- roadmap ideas
- architecture discussions
- recipe suggestions before implementation

If Discussions is not enabled yet, open an issue only when there is a concrete actionable defect or documentation problem.

### Bug Reports

Use GitHub Issues for:

- reproducible defects
- broken scripts or startup flows
- frontend or backend regressions
- documentation inaccuracies
- recipe metadata or loading problems

Before opening an issue:

- review [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- review [`SECURITY.md`](./SECURITY.md) if the problem may be security-related
- gather logs, environment details, and reproduction steps

### Security Reports

Do **not** open public issues for security vulnerabilities.

Follow the private reporting guidance in [`SECURITY.md`](./SECURITY.md).

### Commercial Support and Licensing

Commercial usage, client delivery, consulting, hosting, managed services, and other revenue-generating use require separate written permission.

See [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md), [`LICENSE`](./LICENSE), and [`docs/licensing.md`](./docs/licensing.md).

## What to Include in a Support Request

Provide:

- operating system
- installation path or install method
- Python, Node.js, and Docker versions when relevant
- exact command used
- expected result
- actual result
- logs, screenshots, or stack traces
- whether the issue is reproducible

## Self-Check Before Requesting Help

Consider running:

```bash
./check.sh
```

For backend startup validation:

```bash
.venv/bin/python -m uvicorn daemon.main:app --host 127.0.0.1 --port 8000
```

For frontend validation:

```bash
cd frontend
npm run build
npm run lint
```

## Response Expectations

Support is provided on a best-effort basis unless a separate commercial agreement says otherwise.

Clear reproduction details and validation output improve response quality and turnaround.
