from __future__ import annotations

import json

from daemon.models.recipe import Recipe, RecipePlatformExportArtifact, RecipePlatformExports


def _shell_single_quote(value: str) -> str:
    return value.replace("'", "'\\''")


def _is_notebook_recipe(recipe: Recipe) -> bool:
    return (recipe.ui.type or "").lower() == "notebook"


def _get_recipe_url(recipe: Recipe, host: str) -> str:
    scheme = recipe.ui.scheme or "http"
    path = recipe.ui.path or "/"
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{scheme}://{host}:{recipe.ui.port}{path}"


def _get_surface_label(recipe: Recipe) -> str:
    if _is_notebook_recipe(recipe):
        return "Notebook"
    if recipe.ui.type == "api-only":
        return "API"
    return "Web App"


def _get_open_label(recipe: Recipe) -> str:
    if _is_notebook_recipe(recipe):
        return "Open notebook →"
    if recipe.ui.type == "api-only":
        return "Open endpoint →"
    return "Open app →"


def build_platform_exports(recipe: Recipe, host: str) -> RecipePlatformExports:
    api_url = (recipe.integration.api_url if recipe.integration else "") or ""
    api_url = api_url.replace("<NVIDIA_AI_HUB_IP>", host)
    launch_url = _get_recipe_url(recipe, host)
    runtime_env_path = recipe.runtime_env_path or '<recipe>/.env'
    install_command = recipe.commands[0].command if recipe.commands else f"./run.sh {recipe.slug}"
    launch_port = recipe.ui.port or 8080
    surface_type = recipe.ui.type or "web"
    is_notebook = _is_notebook_recipe(recipe)
    surface_label = _get_surface_label(recipe)
    open_label = _get_open_label(recipe)
    has_api_integration = bool(api_url or (recipe.integration and recipe.integration.model_id) or surface_type == 'api-only')
    show_endpoint_summary = True
    show_sync_script = surface_type != 'cli'
    show_ssh_command = True
    memory_min = recipe.requirements.min_memory_gb if recipe.requirements else 8
    memory_recommended = recipe.requirements.recommended_memory_gb if recipe.requirements and recipe.requirements.recommended_memory_gb else memory_min

    deployment_profiles = [
        {
            "profile": "workstation",
            "host": "Single-user NVIDIA workstation",
            "launch_mode": "local-ui",
            "recommended_memory_gb": memory_recommended,
            "network": f"Direct browser access on :{launch_port}",
        },
        {
            "profile": "lab",
            "host": "Shared lab or classroom node",
            "launch_mode": "shared-ui",
            "recommended_memory_gb": memory_recommended,
            "network": "Reverse proxy or controlled LAN exposure recommended",
        },
        {
            "profile": "server",
            "host": "Headless remote NVIDIA server",
            "launch_mode": "ssh-bootstrap",
            "recommended_memory_gb": memory_recommended,
            "network": "Use SSH bootstrap plus endpoint export for consumers",
        },
        {
            "profile": "dgx",
            "host": "DGX or multi-user GPU platform",
            "launch_mode": "managed-service",
            "recommended_memory_gb": max(memory_recommended, memory_min),
            "network": "Integrate with scheduler, reverse proxy, or fleet tooling",
        },
    ]

    metadata = json.dumps({
        "app": recipe.name,
        "slug": recipe.slug,
        "version": recipe.version,
        "surface": {
            "type": surface_type,
            "url": launch_url,
            "port": launch_port,
            "path": recipe.ui.path or '/',
            "scheme": recipe.ui.scheme or 'http',
        },
        "integration": {
            "api_url": api_url,
            "model_id": recipe.integration.model_id if recipe.integration else "",
            "api_key": recipe.integration.api_key if recipe.integration else "",
        } if recipe.integration else None,
        "runtime_env_path": runtime_env_path,
        "source": recipe.source,
    }, indent=2)

    sync_script_steps = (
        [
            f'export NVIDIA_AI_HUB_NOTEBOOK_URL="{launch_url}"',
            f'export NVIDIA_AI_HUB_NOTEBOOK_PORT="{launch_port}"',
            f'echo "Notebook surface ready for {recipe.name}"',
        ]
        if is_notebook else
        [
            (f'export NVIDIA_AI_HUB_API_URL="{api_url}"' if api_url else f'export NVIDIA_AI_HUB_API_URL="http://{host}:{launch_port}"'),
            (f'export NVIDIA_AI_HUB_MODEL_ID="{recipe.integration.model_id}"' if recipe.integration and recipe.integration.model_id else None),
            f'echo "API endpoint prepared for {recipe.name}"',
        ]
        if surface_type == 'api-only' else
        [
            f'export NVIDIA_AI_HUB_URL="{launch_url}"',
            f'export NVIDIA_AI_HUB_PORT="{launch_port}"',
            f'echo "Web surface ready for {recipe.name}"',
        ]
    )

    sync_script = '\n'.join([
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        '',
        f'export NVIDIA_AI_HUB_RECIPE="{recipe.slug}"',
        f'export NVIDIA_AI_HUB_RUNTIME_ENV="{runtime_env_path}"',
        *[item for item in sync_script_steps if item],
        f'echo "Launching {recipe.name} via NVIDIA AI Hub exports"',
        install_command,
    ])

    remote_bootstrap = [
        'cd ~/nvidia-ai-hub',
        f'export NVIDIA_AI_HUB_RECIPE={recipe.slug}',
        f"export NVIDIA_AI_HUB_RUNTIME_ENV='{_shell_single_quote(runtime_env_path)}'",
        (
            f"echo \"Notebook endpoint will be exposed at {_shell_single_quote(launch_url)}\""
            if is_notebook else
            f"echo \"API endpoint will be exposed at {_shell_single_quote(api_url or f'http://{host}:{launch_port}')}\""
            if surface_type == 'api-only' else
            f"echo \"Web endpoint will be exposed at {_shell_single_quote(launch_url)}\""
        ),
        install_command,
    ]
    ssh_command = f"ssh <nvidia-host> '{' && '.join(remote_bootstrap)}'"

    endpoint_summary = '\n'.join([
        f'Surface label: {surface_label}',
        f'Open action: {open_label}',
        f'Surface type: {surface_type}',
        f'Launch URL: {launch_url}',
        *( [f"API URL: {api_url or f'http://{host}:{launch_port}'}"] if has_api_integration else [] ),
        f'Port: {launch_port}',
        f"Path: {recipe.ui.path or '/'}",
        f"Scheme: {recipe.ui.scheme or 'http'}",
        f'Runtime env: {runtime_env_path}',
    ])

    artifacts = [
        RecipePlatformExportArtifact(
            label='Portable metadata',
            description='Structured metadata for external launchers or inventory systems.',
            value=metadata,
            filename=f'{recipe.slug}-metadata.json',
            mime_type='application/json;charset=utf-8',
            visible=True,
        ),
        RecipePlatformExportArtifact(
            label='Deployment profiles',
            description='Portable environment presets for workstation, lab, server, and DGX rollout planning.',
            value=json.dumps(deployment_profiles, indent=2),
            filename=f'{recipe.slug}-deployment-profiles.json',
            mime_type='application/json;charset=utf-8',
            visible=True,
        ),
        RecipePlatformExportArtifact(
            label='NVIDIA Sync custom script',
            description='Drop-in shell snippet for a custom script integration surface.',
            value=sync_script,
            filename=f'{recipe.slug}-nvidia-sync.sh',
            mime_type='text/x-shellscript;charset=utf-8',
            visible=show_sync_script,
        ),
        RecipePlatformExportArtifact(
            label='SSH remote launch',
            description='Bootstrap the recipe on a remote supported NVIDIA Linux host over SSH.',
            value=ssh_command,
            filename=f'{recipe.slug}-ssh-launch.sh',
            mime_type='text/x-shellscript;charset=utf-8',
            visible=show_ssh_command,
        ),
        RecipePlatformExportArtifact(
            label='Launch endpoint',
            description='Resolved endpoint and runtime hints for downstream tooling.',
            value=endpoint_summary,
            filename=f'{recipe.slug}-endpoint.txt',
            mime_type='text/plain;charset=utf-8',
            visible=show_endpoint_summary,
        ),
    ]

    return RecipePlatformExports(
        metadata=metadata,
        deployment_profiles=json.dumps(deployment_profiles, indent=2),
        sync_script=sync_script,
        ssh_command=ssh_command,
        endpoint_summary=endpoint_summary,
        show_endpoint_summary=show_endpoint_summary,
        show_sync_script=show_sync_script,
        show_ssh_command=show_ssh_command,
        artifacts=[item for item in artifacts if item.visible],
    )