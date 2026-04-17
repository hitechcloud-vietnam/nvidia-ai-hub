# Jan Runtime Bridge

Host-managed Jan baseline for NVIDIA GPUs that documents how to use Jan Desktop or the `jan` CLI to expose a local OpenAI-compatible API server on port `1337` with mandatory API-key protection.

## What it provides

- Official Jan Desktop and Jan CLI workflow for local model serving
- Built-in OpenAI-compatible API server on port `1337` by default
- API prefix `/v1` by default for OpenAI-style clients
- Jan CLI `jan serve` flow for terminal-driven startup and optional background serving
- Explicit API-key requirement for client access

## Default access

- Models API: `http://localhost:1337/v1/models`
- Chat Completions API: `http://localhost:1337/v1/chat/completions`
- Anthropic-compatible Messages API: `http://localhost:1337/v1/messages`
- Base URL for OpenAI-compatible clients: `http://localhost:1337/v1`

## Included services

This bridge recipe does not create a Docker service. It describes a host-managed Jan runtime driven by:

- Jan Desktop: used to initialize the data folder, manage runtimes, and operate the Local API Server UI
- `jan` CLI: used to serve a selected local model directly from the terminal

## Scope of this preset

This recipe intentionally provides a conservative bridge baseline:

- uses Jan's official desktop and CLI installation path instead of inventing an unverified container image
- assumes Jan is installed directly on the host and that the local engine is configured there
- documents both Jan Local API Server UI settings and Jan CLI serving as supported operator paths
- keeps Jan's native data folder ownership for models, logs, and settings instead of remapping them into this repository
- keeps reverse proxies, Windows services, Linux systemd units, TLS termination, and multi-host routing out of scope

This preset does **not** include:

- a bundled Docker image for Jan
- automatic installation of Jan Desktop, Jan CLI, or Jan runtime backends
- guaranteed support for every Jan ecosystem feature such as agents, MCP routing, or cloud connectors
- production gateway hardening, SSO, or certificate management

## Required configuration

Before first use, review `registry/recipes/jan-runtime-bridge/.env` and adjust at least:

- `JAN_SERVER_PORT`
- `JAN_MODEL_ID`
- `JAN_CONTEXT_LENGTH`
- `JAN_API_KEY`
- `JAN_SERVER_HOST`
- `JAN_API_PREFIX`
- `JAN_TRUSTED_HOSTS`

Install Jan on the host first:

- Windows: download and run the Jan installer, then launch Jan once
- Linux: install the `.deb` or AppImage variant documented by Jan, then launch Jan once

Upstream documentation states that Jan CLI is installed automatically after Jan Desktop is launched for the first time.

## Runtime notes

- Jan's Local API Server defaults to `127.0.0.1:1337` with API prefix `/v1`.
- Jan documentation states the Local API Server requires a non-empty API key and clients must send `Authorization: Bearer <key>`.
- The Jan UI can expose the server on `0.0.0.0`, but that should only be used on trusted networks with carefully reviewed `Trusted Hosts`.
- CORS is enabled by default in Jan's Local API Server settings.
- `jan serve` exposes a local model at `localhost:6767/v1` by default, but this recipe standardizes on port `1337` to align with Jan's documented Local API Server baseline.
- Jan CLI can auto-download a Hugging Face model when a repo ID is passed and the model is not already available locally.
- Additional `llama.cpp` server arguments can be passed to Jan CLI with `LLAMA_ARG_` environment variables when the selected backend is `llama.cpp`.
- Jan stores its real operational state in host-managed data folders, such as `%APPDATA%\Jan\data` on Windows and `~/.config/Jan/data` on Linux.

## Persistent data

Operational state is primarily stored in Jan's native data folder.

This recipe keeps only lightweight repository-local placeholders under:

- `registry/recipes/jan-runtime-bridge/models`
- `registry/recipes/jan-runtime-bridge/logs`

Use Jan's host data folder and backup process for actual model, configuration, and log persistence.

## Validation scope

Validated in this repository by:

- creating registry metadata, environment templates, and bridge documentation
- aligning commands, ports, and endpoint descriptions with official Jan Desktop and Jan CLI documentation
- modeling Jan as a host-managed bridge instead of claiming an unverified official Docker deployment
- checking the new recipe files for editor diagnostics

Not validated here:

- live Jan installation, first-run setup, or GPU backend configuration
- actual `jan serve` startup, model auto-download, or inference behavior
- Local API Server UI configuration changes inside Jan Desktop
- network exposure on `0.0.0.0`, trusted-host enforcement, or CORS behavior in practice
- any Docker workflow, because this recipe intentionally does not ship a Jan container and Docker is unavailable in this workspace

## License notes

- Jan documentation describes the project as Apache 2.0 licensed
- Review Jan binaries, bundled runtimes, and each selected model license separately before redistribution or commercial packaging
- This bridge recipe documents integration only and does not redistribute Jan installers or binaries

## Risk notes

- Jan's desktop-driven setup means runtime availability and backend configuration can vary across host operating systems.
- Serving on `0.0.0.0` or weakening host restrictions can expose a local inference endpoint beyond the intended trust boundary.
- Large local models or aggressive context settings can exceed available disk, RAM, or GPU memory if operators do not size the deployment carefully.
