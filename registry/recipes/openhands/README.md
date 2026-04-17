# OpenHands

Official image-based OpenHands recipe for NVIDIA GPUs.

## What it provides

- OpenHands web UI on port `3000`
- Persistent app state under `./data/.openhands`
- Persistent workspace mount under `./workspace`
- Docker-backed agent sandboxes using the host Docker socket
- `.env` control for the main agent-server image reference

## Default access

- Web UI: `http://localhost:3000`

## Required host access

This recipe mounts:

- `/var/run/docker.sock`
- `./data/.openhands` to `/.openhands`
- `./workspace` to `/opt/workspace_base`

OpenHands uses the Docker socket to launch agent sandbox containers. The mounted workspace directory is where agent tasks can create, edit, and delete files.

## Important security note

OpenHands is a high-trust agent runtime. It can execute code, mutate files in the mounted workspace, and control additional containers through the Docker socket. Only run tasks you trust, keep the service on a trusted network, and review outputs carefully before using it against important repositories or hosts.

## Key environment variables

- `OPENHANDS_PORT`: host port for the web UI
- `AGENT_SERVER_IMAGE_REPOSITORY`: agent sandbox image repository
- `AGENT_SERVER_IMAGE_TAG`: agent sandbox image tag
- `WORKSPACE_MOUNT_PATH`: in-container workspace base path
