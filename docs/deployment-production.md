# Production Deployment Guide

This guide describes a practical production-style deployment model for NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC.

It is intended for Linux operators running the application on supported NVIDIA GPU hosts.

This guide covers:

- deployment goals and support boundaries
- host preparation
- `uvicorn` foreground validation
- `systemd` service management
- optional PM2-based persistence
- reverse proxy patterns with Nginx and Caddy
- TLS, LAN exposure, and public exposure notes

Tracked deployment example assets are available under [`../deploy/`](../deploy/):

- [`../deploy/systemd/nvidia-ai-hub@.service`](../deploy/systemd/nvidia-ai-hub@.service)
- [`../deploy/nginx/nvidia-ai-hub.conf`](../deploy/nginx/nvidia-ai-hub.conf)
- [`../deploy/caddy/Caddyfile`](../deploy/caddy/Caddyfile)
- [`../deploy/pm2/ecosystem.config.cjs`](../deploy/pm2/ecosystem.config.cjs)

For baseline installation and platform requirements, see [`docs/installation.md`](./installation.md).

For active rollout priorities and implementation sequencing that may affect deployment guidance, review [`../planning/development-execution-plan.md`](../planning/development-execution-plan.md).

## 1. Recommended production model

For production-style operation on Linux, the preferred sequence is:

1. prepare a supported Linux host with Docker and NVIDIA runtime support
2. validate the application in the foreground with `uvicorn`
3. place the application behind a reverse proxy
4. manage the API process with `systemd`
5. expose the service only after validating host security, TLS, and network boundaries

Recommended stack:

- Linux host
- NVIDIA driver and `nvidia-smi`
- Docker Engine
- NVIDIA Container Toolkit
- Python `3.11+`
- Node.js `22+` when frontend rebuilds are needed
- `systemd` for service supervision
- Nginx or Caddy for reverse proxy and TLS

## 2. Support boundary

- Linux is the primary deployment target.
- Windows and macOS are documented for development workflows, not the preferred production platform for GPU-backed local deployments.
- PM2 is optional and acceptable for lightweight persistence, but `systemd` is the preferred Linux service manager.

## 3. Host readiness checklist

Before exposing the application to other users, verify:

```bash
python3 --version
node --version
npm --version
docker --version
docker info
nvidia-smi
./check.sh
```

For GPU-backed containers, also verify:

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

Expected result:

- Docker daemon is reachable
- GPU is visible on the host
- GPU is visible inside a Docker container
- repository checks pass

## 4. Foreground validation before service setup

Always validate the application in a normal foreground shell first.

From the repository root:

```bash
cp .env.example .env
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd frontend
npm install
npm run build
cd ..
./run.sh --host 0.0.0.0 --port 9000
```

Then confirm:

- `http://localhost:9000` loads
- `GET /api/recipes` responds successfully
- system metrics appear as expected for the host

Do not move to `systemd`, PM2, or reverse proxy setup until the foreground process works correctly.

## 5. Example `systemd` service

`systemd` is the preferred Linux production process manager.

Create `/etc/systemd/system/nvidia-ai-hub@.service`:

```ini
[Unit]
Description=NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=%i
WorkingDirectory=/home/%i/nvidia-ai-hub
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/%i/nvidia-ai-hub/.venv/bin/python -m uvicorn daemon.main:app --host 0.0.0.0 --port 9000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Example enablement for user `ubuntu`:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nvidia-ai-hub@ubuntu.service
sudo systemctl start nvidia-ai-hub@ubuntu.service
sudo systemctl status nvidia-ai-hub@ubuntu.service
```

Useful commands:

```bash
sudo journalctl -u nvidia-ai-hub@ubuntu.service -f
sudo systemctl restart nvidia-ai-hub@ubuntu.service
sudo systemctl stop nvidia-ai-hub@ubuntu.service
```

Adjust the working directory and user path to match your installation path.

The tracked unit file already reads `HOST` and `PORT` from the service environment. For repository-local defaults, keep `NVIDIA_AI_HUB_HOST` and `NVIDIA_AI_HUB_PORT` in `.env` aligned with the values you expose through your process manager or reverse proxy.

If you want a tracked starter file instead of copying from this document, begin with [`../deploy/systemd/nvidia-ai-hub@.service`](../deploy/systemd/nvidia-ai-hub@.service) and update the user, group, working directory, and bind settings for your host.

## 6. Optional PM2 deployment

PM2 is optional. It can be useful for quick persistence on single-user systems or lab environments.

Install PM2:

```bash
npm install -g pm2
```

Start the application:

```bash
cd ~/nvidia-ai-hub
pm2 start ./run.sh --name nvidia-ai-hub -- --host 0.0.0.0 --port 9000
pm2 save
```

Useful commands:

```bash
pm2 status
pm2 logs nvidia-ai-hub
pm2 restart nvidia-ai-hub
pm2 stop nvidia-ai-hub
pm2 delete nvidia-ai-hub
```

PM2 is acceptable for lightweight persistence, but `systemd` remains the preferred Linux production option.

If you prefer a tracked PM2 starter, use [`../deploy/pm2/ecosystem.config.cjs`](../deploy/pm2/ecosystem.config.cjs) and update the repository path, Python path, and bind settings before use.

## 7. Reverse proxy with Nginx

Use a reverse proxy when:

- exposing the application beyond localhost
- terminating TLS
- applying header policies
- standardizing access through port `80` or `443`

Example Nginx site:

```nginx
server {
    listen 80;
    server_name ai-hub.example.internal;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

After saving the site:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

You can also start from the tracked example file at [`../deploy/nginx/nvidia-ai-hub.conf`](../deploy/nginx/nvidia-ai-hub.conf).

## 8. Reverse proxy with Caddy

Caddy is a good option when you want simpler configuration and automatic TLS in environments with valid DNS and inbound access.

Example `Caddyfile`:

```caddy
ai-hub.example.internal {
    reverse_proxy 127.0.0.1:9000
}
```

Reload Caddy after updating the file.

You can also start from the tracked example file at [`../deploy/caddy/Caddyfile`](../deploy/caddy/Caddyfile).

If the deployment is internal-only and not suitable for public certificate issuance, use your internal PKI or terminate TLS with your existing infrastructure.

## 9. TLS guidance

If the service is reachable by other users, prefer HTTPS.

Recommended approach:

- keep `uvicorn` bound to localhost or an internal interface where practical
- terminate TLS at Nginx, Caddy, or an existing load balancer
- use trusted certificates from your public CA or internal CA

Avoid exposing the raw `uvicorn` process directly to the public internet unless you have separately handled TLS, access control, logging, and network policy.

## 10. LAN and public exposure guidance

### LAN-only deployments

Good fit for:

- workstations
- lab systems
- private team environments

Recommended minimum controls:

- trusted local network only
- host firewall rules limiting inbound ports
- reverse proxy in front of the app
- explicit review of exposed recipe services and mapped ports

### Public or internet-reachable deployments

Use extra caution.

Minimum expectations:

- reverse proxy with HTTPS
- firewall restrictions
- controlled DNS and certificate management
- host patching discipline
- Docker and NVIDIA runtime maintenance
- careful review of recipe behavior before exposing any recipe-managed service externally

Many recipes expose their own application ports and may have separate authentication, model download, or network behavior. Review each recipe before public exposure.

## 11. Security and operations notes

- Keep Python, Node.js, Docker, and OS packages updated.
- Review recipe environment files before starting a service.
- Do not store secrets in committed `.env.example` files.
- Keep the main app and reverse proxy logs available for troubleshooting.
- Validate that `frontend/dist` is current after frontend changes.
- Re-run `./check.sh` after major host or dependency changes.

## 12. Suggested production validation checklist

Before calling a deployment ready, record evidence for:

- `npm run lint`
- `npm run build`
- `python -m compileall daemon`
- foreground startup with `uvicorn`
- `./check.sh`
- `docker info`
- `nvidia-smi`
- GPU-enabled Docker smoke test
- reverse proxy configuration test, such as `nginx -t`, when applicable
- targeted recipe validation for changed or high-risk recipes

If a validation step was not run, document that clearly together with residual operational risk.

When production guidance changes, review `README.md`, `docs/installation.md`, `docs/local-development.md`, and `SUPPORT.md` together so support boundaries, commands, and reviewer expectations remain aligned.