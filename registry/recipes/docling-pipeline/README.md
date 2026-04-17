# Docling Pipeline

Local document-conversion pipeline for NVIDIA GPUs using the official `docling` Python package and a lightweight FastAPI job API.

## What it provides

- FastAPI docs on port `3087`
- `GET /health` readiness endpoint
- `GET /config` to inspect export settings and upload limits
- `POST /convert` for batch document conversion from multipart uploads
- `GET /jobs` and `GET /jobs/{job_id}` to inspect saved batch manifests
- `GET /jobs/{job_id}/artifacts/{relative_path}` to download exported outputs
- Persistent workspace mounts for uploads, exports, and conversion manifests

## Default access

- API docs: `http://localhost:3087/docs`
- Health: `http://localhost:3087/health`
- Config: `http://localhost:3087/config`

## Included services

- custom local Python 3.11 image built in this repository
- official upstream `docling` Python package installed at container build time
- FastAPI wrapper for repeatable upload, conversion, and artifact download workflows

## Scope of this pipeline

Included here:

- batch upload workflow for one or more local documents per job
- persistent job folders under `workspace/inputs`, `workspace/outputs`, and `workspace/manifests`
- direct Docling conversion from local files using `DocumentConverter()`
- export generation for Markdown, JSON, HTML, plain text, YAML, and DocTags
- manifest persistence even when some files in a batch fail

Not included here:

- the upstream experimental Docling service stack
- authentication, RBAC, or multi-tenant queueing
- browser-based rich preview UI beyond FastAPI Swagger docs
- optional VLM, remote service, or GPU-specific pipeline tuning flags
- prebuilt RAG ingestion for vector stores or downstream frameworks

## Supported workflow

1. Open the API docs.
2. Submit one or more local documents to `POST /convert`.
3. Optionally set `export_formats` as a comma-separated list such as `md,json,html`.
4. Review the returned job manifest.
5. Use `GET /jobs/{job_id}` or the artifact download route to inspect outputs.

Docling upstream supports many document types, including PDF, DOCX, PPTX, XLSX, HTML, images, audio, Markdown-family text inputs, and more. Actual success depends on the selected input files and upstream parser support.

## Persistent data

This recipe stores state under:

- `registry/recipes/docling-pipeline/workspace/inputs`
- `registry/recipes/docling-pipeline/workspace/outputs`
- `registry/recipes/docling-pipeline/workspace/manifests`

## Configuration notes

Set these values in `.env` before launching if needed:

- `HOST_PORT` - host port for the FastAPI service
- `API_PORT` - container port used by Uvicorn
- `WORKSPACE_ROOT` - mounted persistent workspace root inside the container
- `DEFAULT_EXPORT_FORMATS` - default comma-separated export list
- `MAX_UPLOAD_MB` - per-file upload limit enforced by the API
- `LOG_LEVEL` - runtime log verbosity

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, Docker build assets, compose definition, workspace scaffold, API app, and recipe documentation
- aligning the API behavior with documented Docling conversion and export methods such as `export_to_markdown`, `export_to_dict`, `export_to_html`, and `export_to_doctags`
- checking editor diagnostics for the new Docling recipe files
- confirming Python syntax for the local FastAPI app

Not validated here:

- live Docker build or container startup, because Docker is unavailable in this Windows workspace
- real document upload and conversion smoke tests against local sample files in a running container
- optional OCR, VLM, audio, or remote-service flows described by upstream Docling docs

## License notes

- Upstream project: `docling-project/docling`
- Upstream project license: MIT
- Review model, OCR engine, and downstream export usage terms before production redistribution

## Risk notes

- Docling upstream evolves quickly and supports many optional pipelines; future versions may change conversion defaults or dependency footprints.
- Large or complex documents can consume significant CPU, RAM, and disk during conversion and export generation.
- Uploaded files and exported structured outputs may contain sensitive content; review retention and access controls before operational use.
- This recipe is a practical local pipeline starter for roadmap coverage and experimentation, not a hardened production document-processing platform.
