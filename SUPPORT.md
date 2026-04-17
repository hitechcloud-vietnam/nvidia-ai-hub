# Support

## Purpose

This document explains where to ask questions, where to report problems, and how to request commercial assistance for NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC.

`NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC` is a software solution developed and distributed by **Pho Tue SoftWare And Technology Solutions Joint Stock Company** (including the **HiTechCloud** brand).

Official company details:

- Vietnamese legal entity name: **CÔNG TY CỔ PHẦN GIẢI PHÁP CÔNG NGHỆ VÀ PHẦN MỀM PHỔ TUỆ**
- English legal entity name: **Pho Tue SoftWare And Technology Solutions Joint Stock Company**
- Tax code: `0318222903`
- D-U-N-S Number: `557339920`
- Registered address: `128 Binh My Street, Binh My Commune, Ho Chi Minh City`

The short product name `NVIDIA AI Hub` and the detailed product name `NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC` refer to the same software solution unless a specific legal or commercial document states otherwise.

`NVIDIA`, the `NVIDIA` logo, `DGX`, `CUDA`, and related NVIDIA names are trademarks and/or registered trademarks of **NVIDIA Corporation** and its affiliates in the United States and other countries. References to NVIDIA technologies in this repository are descriptive only and do not imply endorsement or sponsorship unless expressly stated in writing.

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
- review [`docs/installation.md`](./docs/installation.md) for supported deployment boundaries and prerequisites
- review [`docs/deployment-production.md`](./docs/deployment-production.md) for Linux production service, reverse proxy, TLS, and exposure guidance
- review [`docs/local-development.md`](./docs/local-development.md) for source-based setup and validation commands
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

On Windows or macOS, use the equivalent source-based checks from [`docs/local-development.md`](./docs/local-development.md).

For platform prerequisites, Docker setup, NVIDIA runtime expectations, and PM2 notes, review [`docs/installation.md`](./docs/installation.md).

For Linux production deployment patterns, reverse proxy validation, and network exposure notes, review [`docs/deployment-production.md`](./docs/deployment-production.md).

For backend startup validation:

```bash
.venv/bin/python -m uvicorn daemon.main:app --host 127.0.0.1 --port 8000
```

On Windows:

```powershell
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --host 127.0.0.1 --port 8000
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
