# ComfyUI Manager Preset Pack

Manager-enabled ComfyUI workspace for NVIDIA GPUs that layers the official `ComfyUI-Manager` extension onto the existing `comfyui-spark` base image so operators can install custom nodes, manage snapshots, and import reusable component packs from one persistent visual workflow environment.

## What it provides

- ComfyUI web UI on port `8188`
- Official `ComfyUI-Manager` installed under `ComfyUI/custom_nodes/comfyui-manager`
- Manager-enabled startup via `--enable-manager`
- Persistent ComfyUI models, inputs, outputs, custom nodes, and user data
- Persistent manager config, snapshots, and component-pack storage under `ComfyUI/user/__manager`
- Optional mirror environment variables for GitHub and Hugging Face constrained-network environments

## Default access

- ComfyUI UI: `http://localhost:8188/`
- Manager UI entrypoint: open the main ComfyUI menu and click **Manager**

## Included services

- `comfyui-manager-preset-pack`: one GPU-enabled ComfyUI container with the manager extension preinstalled

## Scope of this preset

This recipe intentionally provides a manager-ready ComfyUI baseline:

- keeps the existing `comfyui-spark` runtime as the base application layer
- installs the official `ComfyUI-Manager` extension using the documented `custom_nodes/comfyui-manager` layout
- enables the manager UI on startup with `--enable-manager`
- persists manager-owned configuration, snapshots, and component packs across restarts
- leaves actual custom-node selection, pack import, and workflow curation to the operator after launch

This preset does **not** include:

- a bundled third-party custom-node collection or opinionated node pack
- predownloaded checkpoints, LoRAs, or model assets
- reverse-proxy auth, TLS termination, or multi-user isolation
- validation that every manager-installable custom node works inside this image

## Required configuration

Before first launch, review `registry/recipes/comfyui-manager-preset-pack/.env` and change what applies to your environment:

- `COMFYUI_PORT`
- `CLI_ARGS`
- `COMFYUI_MANAGER_SECURITY_LEVEL`
- `COMFYUI_MANAGER_NETWORK_MODE`
- `COMFYUI_MANAGER_BYPASS_SSL` if upstream certificate validation fails in your environment
- `GITHUB_ENDPOINT` and `HF_ENDPOINT` if you rely on mirrors or relays

## Runtime notes

- Upstream ComfyUI documents manager enablement with the `--enable-manager` flag.
- Upstream ComfyUI-Manager documents that the extension must live at `ComfyUI/custom_nodes/comfyui-manager`.
- Component packs are stored under `ComfyUI/user/__manager/components` and snapshots under `ComfyUI/user/__manager/snapshots`.
- The first launch may still require operators to install additional custom nodes or models from the Manager UI depending on the workflows they plan to run.
- Security and network defaults in this preset are conservative but not hardened for shared multi-tenant exposure.

## Persistent data

This recipe persists state through Docker volumes for:

- `/app/ComfyUI/models`
- `/app/ComfyUI/output`
- `/app/ComfyUI/input`
- `/app/ComfyUI/custom_nodes`
- `/app/ComfyUI/user`

## Validation scope

Validated in this repository by:

- creating catalog metadata, environment templates, compose definition, Docker build recipe, startup wrapper, and operator documentation for the manager-enabled preset
- aligning the build and runtime shape with upstream ComfyUI guidance for `--enable-manager` and upstream ComfyUI-Manager guidance for installation at `ComfyUI/custom_nodes/comfyui-manager`
- wiring persistent storage for manager config, snapshots, components, user state, custom nodes, and standard ComfyUI input/output/model paths
- checking the new recipe files for editor diagnostics

Not validated here:

- live `docker compose up`, image build, Manager UI rendering, custom-node installation, or workflow execution, because Docker is not available in this Windows workspace
- compatibility of any specific third-party custom node installed later through the Manager UI
- mirror/proxy behavior for `GITHUB_ENDPOINT` or `HF_ENDPOINT` in restricted-network deployments
- hardened security behavior for internet-exposed or multi-user ComfyUI deployments

## License notes

- Upstream ComfyUI: GPL-3.0
- Upstream ComfyUI-Manager: GPL-3.0
- Review any installed custom node or downloaded model license separately before production use

## Risk notes

- Custom nodes installed later through the Manager UI can introduce dependency conflicts or unreviewed code.
- Exposing the manager UI to untrusted networks increases operational and supply-chain risk.
- Manager defaults here do not replace a formal reverse proxy, access control layer, or curated allowlist process for production environments.
