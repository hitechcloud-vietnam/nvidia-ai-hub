# RAGFlow

Official image-based RAGFlow stack for NVIDIA GPUs using the upstream CPU container together with Elasticsearch, MySQL, MinIO, and Redis.

## What it provides

- RAGFlow web UI on port `3082`
- RAGFlow HTTP API on port `9386`
- RAGFlow admin API on port `9387`
- Local Elasticsearch, MySQL, MinIO, and Redis services aligned with the upstream Docker deployment
- Persistent local data and logs under `./data/*`

## Default access

- Web UI: `http://localhost:3082`
- HTTP API: `http://localhost:9386`
- Admin API: `http://localhost:9387`
- Elasticsearch: `http://localhost:1202`
- MinIO API: `http://localhost:9002`
- MinIO console: `http://localhost:9003`
- MySQL: `localhost:5456`
- Redis: `localhost:6381`

## Included services

- `ragflow-cpu`: official upstream RAGFlow web and API container
- `es01`: Elasticsearch document and vector index backend
- `mysql`: application metadata database
- `minio`: object storage for uploaded files and generated artifacts
- `redis`: cache and queue backend

## Required configuration

Before first launch, update `./.env` and change at least these values:

- `ELASTIC_PASSWORD`
- `MYSQL_PASSWORD`
- `MINIO_PASSWORD`
- `REDIS_PASSWORD`

After first login, configure your model providers in the RAGFlow UI, or uncomment and complete `user_default_llm` in `service_conf.yaml.template` if you want a preconfigured default provider.

If you change ports or hostnames, keep `./.env` and `service_conf.yaml.template` aligned so the RAGFlow container can still reach MySQL, MinIO, Redis, and Elasticsearch.

## Scope of this recipe

This recipe intentionally focuses on the practical upstream CPU deployment for this repository:

- official `infiniflow/ragflow` image
- default Elasticsearch document engine
- bundled MySQL, MinIO, and Redis dependencies
- mounted local `service_conf.yaml.template` for straightforward provider and storage customization

This recipe does **not** bundle:

- GPU mode
- TEI embedding sidecars
- sandbox executor / gVisor setup
- Kibana, Infinity, OceanBase, OpenSearch, or SeekDB profiles
- HTTPS certificate wiring

## Host requirements

- CPU >= 4 cores
- RAM >= 16 GB
- Disk >= 50 GB
- Docker >= 24 and Docker Compose >= 2.26
- x86 host images only

If you use Docker Desktop with WSL 2, ensure the Elasticsearch requirement `vm.max_map_count >= 262144` is satisfied before startup.

## Persistent data

This recipe stores data under:

- `registry/recipes/ragflow/data/elasticsearch`
- `registry/recipes/ragflow/data/mysql`
- `registry/recipes/ragflow/data/minio`
- `registry/recipes/ragflow/data/redis`
- `registry/recipes/ragflow/data/ragflow-logs`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, service configuration, compose definition, and documentation
- aligning the bundled services and image references with the official RAGFlow Docker deployment
- wiring health-checked startup ordering for Elasticsearch, MySQL, MinIO, Redis, and the RAGFlow CPU service
- exposing non-conflicting local ports for the UI, API, admin API, and bundled data services

Not validated here:

- full runtime startup on this Windows workspace
- first-login flow in the browser
- provider credential setup, document ingestion, search quality, or agent execution
- optional upstream GPU, sandbox, TEI, HTTPS, or alternate document-engine paths

## License notes

- Upstream project: `infiniflow/ragflow`
- Upstream license: Apache License 2.0

## Risk notes

- RAGFlow is resource intensive; Elasticsearch especially needs adequate RAM and the required kernel memory mapping setting.
- Default passwords are placeholders only. Replace them before exposing the stack to any non-local network.
- The official Docker images are built for x86 platforms; ARM64 requires upstream image-build steps instead of this recipe.
