# Security Policy

## Supported Versions

Security fixes are applied on a best-effort basis to the active default branch of this repository.

`NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC` is a software solution developed and distributed by **Pho Tue SoftWare And Technology Solutions Joint Stock Company** (including the **HiTechCloud** brand).

Official company details:

- Vietnamese legal entity name: **CÔNG TY CỔ PHẦN GIẢI PHÁP CÔNG NGHỆ VÀ PHẦN MỀM PHỔ TUỆ**
- English legal entity name: **Pho Tue SoftWare And Technology Solutions Joint Stock Company**
- Tax code: `0318222903`
- D-U-N-S Number: `557339920`
- Registered address: `128 Binh My Street, Binh My Commune, Ho Chi Minh City`

The short product name `NVIDIA AI Hub` and the detailed product name `NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC` refer to the same software solution unless a specific written instrument expressly distinguishes them.

`NVIDIA`, the `NVIDIA` logo, `DGX`, `CUDA`, and related NVIDIA product or platform names are trademarks and/or registered trademarks of **NVIDIA Corporation** and its affiliates. Their mention in this repository is solely for descriptive and compatibility purposes and does not imply endorsement or affiliation unless expressly stated in writing.

Any external publication, advisory, customer notification, or remediation communication that uses the project name together with third-party marks should be reviewed for trademark, attribution, and unfair-competition compliance before distribution.

If you need a security fix, reproduce the issue against the latest `main` branch before reporting it.

## Reporting a Vulnerability

If you believe you have found a security vulnerability in NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC, do **not** open a public issue.

Instead:

1. Prepare a private report with a clear description of the issue.
2. Include affected files, deployment assumptions, and reproduction steps.
3. Describe impact, attack preconditions, and any known mitigations.
4. Provide a proof of concept only when necessary to explain the risk safely.

## What to Include

Please include as much of the following as possible:

- vulnerability type
- affected component or path
- configuration prerequisites
- exact reproduction steps
- expected versus actual behavior
- impact assessment
- suggested remediation, if known

Examples of relevant areas:

- FastAPI endpoints in `daemon/`
- Docker or container orchestration behavior
- installer and runtime scripts
- recipe loading and configuration handling
- frontend handling of untrusted data
- secrets exposure or unsafe defaults

## Disclosure Expectations

Please keep the report private until the issue has been investigated and a fix or mitigation is available.

Do not publish exploit details, public proof-of-concept code, or weaponized reproduction steps before coordinated remediation.

## Response Process

The maintainers aim to:

1. acknowledge receipt of the report
2. validate and triage the issue
3. determine severity and scope
4. prepare a fix or mitigation when appropriate
5. communicate resolution guidance

Response timing may vary depending on report quality, complexity, and maintainer availability.

## Out of Scope

The following are generally out of scope unless they create a clear, practical security impact:

- missing best-practice headers without exploitability
- purely theoretical attacks without a reproducible path
- issues caused only by unsupported local modifications
- reports that depend on exposed secrets already controlled by the reporter
- denial-of-service claims without realistic reproduction details

## Safe Harbor

Good-faith security research intended to improve the project is welcome.

Please:

- avoid privacy violations
- avoid data destruction
- avoid service disruption beyond the minimum needed for validation
- avoid accessing data that does not belong to you

## Operational Guidance

Users deploying this project should:

- review recipe sources before running them
- avoid committing `.env` files or credentials
- run Docker with appropriate host security controls
- restrict network exposure when testing new recipes or integrations
- keep Python, Node.js, Docker, and system packages updated
