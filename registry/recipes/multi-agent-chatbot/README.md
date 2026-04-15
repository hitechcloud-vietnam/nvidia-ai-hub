# Multi-Agent Chatbot on DGX Spark

This recipe adapts NVIDIA's `multi-agent-chatbot` DGX Spark playbook for NVIDIA AI Hub. It launches a full local stack with:

- Next.js frontend on port `3000`
- FastAPI backend on port `8000`
- PostgreSQL conversation storage
- Milvus vector retrieval with etcd and MinIO
- GPU-served supervisor, coding, embedding, and vision model services

## What NVIDIA AI Hub changes

Instead of requiring a manual clone of `NVIDIA/dgx-spark-playbooks`, this recipe builds the upstream images directly from Git and stores persistent runtime data under `registry/recipes/multi-agent-chatbot/data/`.

The first launch is heavy:

- image builds can take 10 to 20 minutes
- model downloads can take 30 to 120 minutes depending on network speed
- default memory usage is roughly `114` to `120 GB`

## Access

After the stack becomes healthy, open:

- `http://<SPARK_IP>:3000` for the chatbot UI
- `http://<SPARK_IP>:8000` for the backend API

If you connect over SSH, forward both ports:

- `3000`
- `8000`

## Configuration

Use the recipe `Configuration` tab to edit:

- `docker-compose.yml` for service topology or model swaps
- `.env` for ports, credentials, and download URLs

### Supervisor profiles

The runtime env exposes `COMPOSE_PROFILES` so you can choose between two supervisor stacks without rewriting the compose file:

- `full` → default `gpt-oss-120b`
- `lightweight` → optional `gpt-oss-20b`

When switching profiles, also keep `CHATBOT_MODELS` aligned with the selected container name:

- `COMPOSE_PROFILES=full` with `CHATBOT_MODELS=gpt-oss-120b`
- `COMPOSE_PROFILES=lightweight` with `CHATBOT_MODELS=gpt-oss-20b`

## Default model stack

The compose file follows NVIDIA's default playbook layout:

- `gpt-oss-120b` as the supervisor model
- `deepseek-coder-6.7b-instruct` for coding tasks
- `Qwen3-Embedding-4B` for embeddings
- `Qwen2-VL-7B-Instruct` for image understanding

## Operational notes

- The backend no longer waits for every model container to become healthy before it starts, which avoids stalled launches while large model services warm up.
- The `qwen2.5-vl` and llama.cpp model services use a longer health-check grace period because first startup can take several minutes.
- Downloaded GGUF files are cached in `registry/recipes/multi-agent-chatbot/data/models/`.
- If the default supervisor is too large, switch to the `lightweight` profile and update `CHATBOT_MODELS` to `gpt-oss-20b`.
- Stopping the recipe preserves downloaded models and chat history. Remove data only if you want a full reset.
