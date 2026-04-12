# Contributing to Spark AI Hub

Thank you for contributing to `spark-ai-hub`.

This document defines the expected workflow for code, documentation, and recipe contributions.

## Scope

Contributions are welcome for:

- Backend API improvements in `daemon/`
- Frontend UI improvements in `frontend/`
- Recipe definitions in `registry/recipes/`
- Installer and runtime scripts
- Documentation and troubleshooting guides
- Bug fixes, performance work, and maintainability updates

## Before You Start

Please:

1. Open an issue for major changes, new features, or large refactors.
2. Keep pull requests focused on a single concern.
3. Prefer small, reviewable commits.
4. Use English for documentation, commit messages, PR titles, and code comments.

## Company Contribution Policy

The repository should follow an enterprise-style contribution standard.

- Use English-only technical writing.
- Prefer direct, implementation-focused documentation over marketing language.
- Keep operational instructions reproducible on a clean machine.
- Do not commit secrets, customer data, tokens, internal endpoints, or proprietary credentials.
- Preserve third-party attribution, notices, and upstream provenance when updating recipes, assets, or installer logic.
- Flag legal, licensing, security, or commercial-impact changes clearly in the pull request.
- Avoid unreviewed breaking changes to installation, runtime, or recipe compatibility flows.

If a contribution introduces external code, assets, models, or copied configuration, document the source and license in the pull request.

## Project Structure

```text
daemon/            FastAPI backend
frontend/          React + Vite frontend
registry/recipes/  App recipe registry
scripts/           Shared shell and PowerShell helpers
install.*          Installation entrypoints
run.*              Local run entrypoints
check.*            Environment validation entrypoints
```

## Local Development

For the complete local setup and validation workflow, see [`docs/local-development.md`](./docs/local-development.md).

## Linux / macOS-style shell workflow

Create local configuration:

```bash
cp .env.example .env
```

Run environment checks:

```bash
./check.sh
```

Start the application:

```bash
./run.sh
```

## Windows PowerShell workflow

Use the commands in [`docs/local-development.md`](./docs/local-development.md).

## Frontend Development

Install dependencies and start the Vite dev server:

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Lint frontend code:

```bash
npm run lint
```

## Backend Development

Create or reuse the virtual environment, then install dependencies:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

On Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run the API directly:

```bash
.venv/bin/python -m uvicorn daemon.main:app --host 127.0.0.1 --port 8000
```

On Windows:

```powershell
.\.venv\Scripts\python.exe -m uvicorn daemon.main:app --host 127.0.0.1 --port 8000
```

## Configuration

Shared local configuration is stored in the repository root `.env` file.

Common settings include:

- `SPARK_AI_HUB_HOST`
- `SPARK_AI_HUB_PORT`
- `SPARK_AI_HUB_NODE_MAJOR`
- `SPARK_AI_HUB_FRONTEND_DIR`
- `SPARK_AI_HUB_REGISTRY_PATH`
- `SPARK_AI_HUB_DATA_DIR`
- `SPARK_AI_HUB_DB_PATH`

Do not commit secrets or machine-specific credentials.

## Coding Standards

### Python

- Follow clear, typed, maintainable FastAPI-style Python.
- Keep functions focused and avoid unrelated refactors.
- Prefer explicit path handling with `pathlib`.
- Use UTF-8 when reading or writing text files that may contain Unicode.

### React / JavaScript

- Keep components small and composable.
- Prefer descriptive prop names and predictable state flow.
- Preserve the existing Vite + ESLint setup.
- Run `npm run build` and `npm run lint` before submitting frontend changes.

### PowerShell and Shell Scripts

- Keep Windows and shell workflows aligned where practical.
- Preserve existing parameter names and user-facing behavior.
- Avoid breaking unattended installer flows.

## Recipe Contributions

Recipe contributions live under `registry/recipes/<slug>/`.

Each recipe should include at minimum:

- `recipe.yaml`
- `docker-compose.yml` when required by the recipe runtime
- Any supporting files needed by that recipe only

Recipe guidelines:

- Keep the `slug` stable and filesystem-safe.
- Use accurate metadata for `name`, `author`, `website`, `upstream`, and `status`.
- Match UI ports and paths to the actual container behavior.
- Set realistic memory and disk requirements.
- Use UTF-8 encoding for YAML files.
- Validate that the recipe can be loaded by the backend without schema errors.

Example validation approach:

```bash
.venv/bin/python -c "from daemon.services.registry_service import load_recipes; print(len(load_recipes()))"
```

On Windows:

```powershell
.\.venv\Scripts\python.exe -c "from daemon.services.registry_service import load_recipes; print(len(load_recipes()))"
```

## Documentation Contributions

Documentation should be:

- English-only
- Direct and technical
- Consistent with actual repository behavior
- Updated together with code changes when behavior changes

Documentation should not include unverifiable claims, internal-only customer context, or ambiguous operational steps.

If you add or change commands, ports, environment variables, or prerequisites, update the relevant documentation in the same pull request.

## Pull Request Checklist

Before opening a pull request, confirm:

- [ ] The change is scoped and reviewable
- [ ] Documentation was updated if behavior changed
- [ ] Security, licensing, and provenance impacts were reviewed
- [ ] Frontend builds successfully with `npm run build` when frontend files changed
- [ ] Frontend lint passes with `npm run lint` when frontend files changed
- [ ] Backend starts successfully when backend or recipe loading behavior changed
- [ ] New or updated recipe files load correctly
- [ ] No secrets, local paths, or machine-specific artifacts were committed

## Commit and PR Guidance

Recommended practices:

- Use clear commit messages
- Reference the issue number when applicable
- Describe user impact in the PR description
- Include screenshots for UI changes
- Include reproduction and validation steps for bug fixes
- Call out breaking changes, security considerations, and license-sensitive updates explicitly

## Review Expectations

Pull requests may be asked to:

- reduce scope
- improve documentation
- align with existing structure
- preserve backward compatibility for scripts and configuration
- add validation steps for recipes or startup flows
- document third-party sources and licensing details more clearly

## License

By contributing to this repository, you agree that your contributions will be licensed under the repository license.

## Questions

If the expected implementation approach is unclear, open an issue before starting large work.

Clear, incremental contributions are preferred over broad rewrites.

## Community Resources

- Contribution workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security reporting: [`SECURITY.md`](./SECURITY.md)
- Collaboration rules: [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)
- Support guide: [`SUPPORT.md`](./SUPPORT.md)
- Governance index: [`docs/community.md`](./docs/community.md)
- Commercial licensing and sponsorship path: [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md)

If GitHub Discussions is enabled for the repository, prefer Discussions for roadmap ideas, usage questions, and broader community conversations that do not require an actionable issue.
