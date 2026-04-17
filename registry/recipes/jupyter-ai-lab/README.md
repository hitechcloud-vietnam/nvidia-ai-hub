# Jupyter AI Lab

JupyterLab workspace preset for NVIDIA GPUs users who want a practical notebook-first environment with scientific Python packages, persistent notebook storage, and Jupyter AI installed for local experimentation against shared model runtimes.

## What it provides

- JupyterLab on port `3095`
- Custom image based on `quay.io/jupyter/scipy-notebook:2025-12-31`
- `jupyter-ai==3.0.0` installed into the notebook environment
- Optional AI magic command package for `%ai` and `%%ai` notebook usage
- Persistent notebook workspace, Jupyter settings, workspaces, and cache directories
- Default pairing to the shared `ollama-runtime` recipe through `http://host.docker.internal:11435`
- A practical lab baseline for notebooks, ad hoc experiments, local data exploration, prompt iteration, and notebook-centric AI workflows

## Default access

- JupyterLab: `http://localhost:3095/lab?token=<JUPYTER_TOKEN>`
- Notebook workspace directory inside the container: `/home/jovyan/work`
- Default token: defined in `registry/recipes/jupyter-ai-lab/.env`

## Included services

- `jupyter-ai-lab`: custom Jupyter Docker Stacks image with JupyterLab, scientific Python tooling, Jupyter AI, and optional AI magic commands
- external dependency on `ollama-runtime` through `http://host.docker.internal:11435` for local Ollama-backed model access if you choose that provider in Jupyter AI

## Scope of this preset

This recipe intentionally provides a practical notebook baseline:

- builds on the upstream Jupyter Docker Stacks `scipy-notebook` image so common Python data-science packages are already available
- installs Jupyter AI into the same environment as JupyterLab
- keeps notebook files, lab workspaces, and settings persistent across restarts
- exposes environment defaults that make Ollama-backed local experimentation easier from Jupyter AI and notebook magics
- supports general notebook work, scratch analysis, prompt exploration, and lightweight AI-assisted experimentation

This preset does **not** include:

- a bundled vector database, document ingestion service, or workflow orchestrator
- preconfigured Jupyter AI provider secrets beyond local Ollama-compatible defaults
- enterprise JupyterHub, multi-user tenancy, SSO, reverse proxying, or TLS hardening
- guaranteed compatibility with every optional Jupyter AI persona, provider, or notebook extension
- validated end-to-end notebook agent workflows in this workspace

## Required configuration

Before first launch:

1. Start `ollama-runtime` if you want local Ollama-backed inference.
2. Review `registry/recipes/jupyter-ai-lab/.env`.
3. Change `JUPYTER_TOKEN` to a strong secret.
4. Launch the recipe.
5. Open `http://localhost:3095/lab?token=<your-token>`.
6. In Jupyter AI settings, select the provider and model you want to use.
7. If you want notebook magics, load them inside a notebook with `%load_ext jupyter_ai_magic_commands`.

## Jupyter AI and notebook notes

- JupyterLab is the default frontend used by current Jupyter Docker Stacks images.
- This recipe uses the upstream Jupyter Docker Stacks startup flow instead of a custom entrypoint.
- `OLLAMA_HOST` defaults to `http://host.docker.internal:11435` so Jupyter AI can be pointed at the shared runtime pattern already used in this repository.
- `OPENAI_API_BASE` and `OPENAI_API_KEY=ollama` are included as convenience defaults for OpenAI-compatible local runtime experiments when applicable.
- Provider selection, model allowlists, blocked providers, and advanced Jupyter AI behavior are still configured in the Jupyter UI or through Jupyter runtime settings after launch.
- The optional magic commands package is installed, but notebook users still need to load the IPython extension per session when they want `%ai` or `%%ai` commands.

## Persistent data

This recipe stores state under:

- `registry/recipes/jupyter-ai-lab/workspace`
- `registry/recipes/jupyter-ai-lab/jupyter-config`
- `registry/recipes/jupyter-ai-lab/cache`

## Validation scope

Validated in this repository by:

- creating recipe metadata, runtime environment files, Docker build definition, compose definition, persistent directories, and reviewer documentation
- aligning the image choice and startup model with upstream Jupyter Docker Stacks guidance where JupyterLab is the default frontend on port `8888`
- aligning Jupyter AI notes with upstream documentation showing Ollama base URL overrides and optional magic command installation
- checking editor diagnostics for the newly created recipe files

Not validated here:

- live `docker compose up`, token-based login, notebook execution, or Jupyter AI chat usage, because Docker is not available in this Windows workspace
- live `%ai` or `%%ai` magic execution against Ollama or any other provider
- compatibility with every JupyterLab extension, remote kernel, or optional Jupyter AI agent package
- multi-user security hardening, HTTPS termination, or production gateway deployment

## License notes

- Upstream projects: `jupyter/docker-stacks` and `jupyterlab/jupyter-ai`
- Review upstream package and container licenses before redistribution or production packaging
- Optional third-party Jupyter AI providers, agents, and model backends can introduce additional licensing or usage terms that are outside this preset

## Risk notes

- This preset is a notebook workspace baseline, not a hardened production notebook platform.
- The token in `.env` is a secret and should be changed before broader exposure.
- Jupyter AI capabilities depend on the chosen provider configuration and reachable model endpoint; installation alone does not guarantee a working local AI workflow.
- Persisted notebook directories can accumulate large datasets, outputs, and caches over time and should be reviewed for capacity growth.
