# LM Studio Bridge

Headless LM Studio baseline for NVIDIA GPUs that documents how to run `llmster` and the `lms` CLI on the host, load a local model, and expose LM Studio's OpenAI-compatible and native REST APIs on port `1234`.

## What it provides

- Official LM Studio headless workflow based on `llmster` and the `lms` CLI
- Default local HTTP server on port `1234`
- OpenAI-compatible endpoints such as `/v1/models`, `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, and `/v1/responses`
- Native LM Studio REST endpoints such as `/api/v0/models`
- Host-managed model download, load, and server lifecycle commands for environments where LM Studio is installed outside Docker

## Default access

- Models API: `http://localhost:1234/v1/models`
- Chat Completions API: `http://localhost:1234/v1/chat/completions`
- Responses API: `http://localhost:1234/v1/responses`
- Native model inventory API: `http://localhost:1234/api/v0/models`

## Included services

This bridge recipe does not create a Docker service. It describes a host-managed LM Studio runtime driven by:

- `llmster`: the LM Studio headless daemon
- `lms`: the LM Studio CLI used to download models, load them into memory, and start or stop the HTTP server

## Scope of this preset

This recipe intentionally provides a conservative bridge baseline:

- uses LM Studio's official headless deployment path instead of an unofficial community container
- assumes LM Studio or `llmster` is installed directly on the target host
- documents the minimum command flow needed to start the daemon, download a model, load it, and expose HTTP APIs
- keeps model management and server state in LM Studio's native host directories instead of trying to remap them into this repository
- keeps reverse proxies, systemd/service wrappers, TLS termination, and multi-host routing out of scope

This preset does **not** include:

- a bundled Docker image for LM Studio, because the official documentation centers on host installation and headless daemon usage
- automatic startup tasks or service registration for Linux, Windows, or macOS
- guaranteed compatibility for every model format or engine supported by LM Studio
- enterprise auth gateways, certificate management, or network policy enforcement

## Required configuration

Before first use, review `registry/recipes/lm-studio-bridge/.env` and adjust at least:

- `LM_STUDIO_PORT`
- `LM_STUDIO_MODEL`
- `LM_STUDIO_MODEL_ALIAS`
- `LM_STUDIO_GPU_OFFLOAD`
- `LM_STUDIO_CONTEXT_LENGTH`
- `LM_STUDIO_ENABLE_CORS`
- `LM_STUDIO_API_KEY` if you intend to require permission-key authentication

Also ensure that LM Studio headless components are installed on the target host. The upstream install examples are:

- Linux and macOS: `curl -fsSL https://lmstudio.ai/install.sh | bash`
- Windows PowerShell: `irm https://lmstudio.ai/install.ps1 | iex`

## Runtime notes

- `lms daemon up` starts `llmster`, the headless LM Studio daemon used for CLI and HTTP serving workflows.
- `lms server start --port <port>` starts the local server; `--cors` is optional and should only be enabled for trusted development scenarios.
- The CLI documentation states that `lms` is available after LM Studio has been run at least once.
- LM Studio can expose OpenAI-compatible APIs and its own native REST API from the same server port.
- If server authentication is enabled in LM Studio, clients must send a Bearer token generated as an LM Studio permission key.
- The exact host path for downloaded models is managed by LM Studio and is not relocated by this recipe.
- This bridge records placeholder `models/` and `logs/` folders only for local documentation and operator notes; they are not authoritative LM Studio storage paths.

## Persistent data

Operational state is primarily stored in LM Studio's native host-managed directories.

This recipe keeps only lightweight repository-local placeholders under:

- `registry/recipes/lm-studio-bridge/models`
- `registry/recipes/lm-studio-bridge/logs`

Use LM Studio's own configuration and host backup process for real model and runtime persistence.

## Validation scope

Validated in this repository by:

- creating registry metadata, environment templates, and operator documentation for the bridge
- aligning commands and documented endpoints with official LM Studio headless, CLI, and API documentation
- explicitly modeling this entry as a host-managed bridge instead of claiming an unverified official Docker runtime
- checking the new recipe files for editor diagnostics

Not validated here:

- live installation of LM Studio, `llmster`, or `lms`
- actual model download, load, or inference behavior on NVIDIA GPUs
- server authentication setup, CORS behavior, or LAN exposure
- Windows, Linux, or macOS service registration workflows
- any Docker-based launch flow, because this bridge intentionally does not ship an official container and Docker is unavailable in this workspace

## License notes

- LM Studio CLI (`lms`) is documented as MIT licensed
- Review LM Studio product terms, runtime terms, and each selected model license separately before redistribution or commercial use
- This bridge recipe documents integration steps only; it does not redistribute LM Studio binaries

## Risk notes

- Because this is a host-managed bridge, installation paths, permissions, and service lifecycle behavior can vary across operating systems.
- Exposing the LM Studio server on a LAN or enabling CORS expands the attack surface and should be paired with permission keys and trusted network controls.
- Large model downloads and high context settings can exceed local disk, memory, or GPU capacity if operators do not size the selected model carefully.
