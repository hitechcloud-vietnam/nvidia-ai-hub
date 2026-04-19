# Leantime

Practical self-hosted Leantime workspace for NVIDIA AI Hub using the official image, a local MySQL database, and persistent project files for a conservative single-instance baseline.

## What it provides

- Leantime web UI on port `8080`
- Local MySQL database for application state
- Persistent user files and plugin directories

## Default access

- Leantime UI: `http://localhost:8080`

## Configuration notes

- Update `registry/recipes/leantime/.env` before first launch.
- `LEAN_APP_URL` should match the published URL, especially behind a reverse proxy.
- Leantime expects a MySQL-compatible database for normal installation flows.
- The first-run installation is completed through the web installer after the containers start.

## Persistent data

This recipe stores state under:

- `registry/recipes/leantime/data/mysql`
- `registry/recipes/leantime/data/userfiles`
- `registry/recipes/leantime/data/plugins`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, compose definition, and documentation
- aligning the stack with the official Leantime Docker guidance, expected MySQL dependency, and published port `8080`
- checking that database wiring, persistent mounts, and published ports are internally consistent

Not validated here:

- live `docker compose up`, web installer completion, email delivery, or plugin management, because Docker is not available in this Windows workspace
- alternate PostgreSQL deployments, Redis-backed integrations, or reverse-proxy TLS setups
- compatibility with every Leantime image tag or plugin combination

## License notes

- Upstream project: `Leantime/leantime`
- Review the upstream license terms and plugin licensing before production redistribution.

## Risk notes

- Incorrect MySQL credentials or failed first-run installation steps can leave the app partially initialized.
- Plugin persistence is mounted conservatively, but plugin compatibility and upgrade behavior were not validated here.