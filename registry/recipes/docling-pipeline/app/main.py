from __future__ import annotations

import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import yaml
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from docling.document_converter import DocumentConverter

APP_TITLE = "Docling Pipeline"
API_PORT = int(os.getenv("API_PORT", "8000"))
WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "/workspace"))
DEFAULT_EXPORT_FORMATS = [
    part.strip().lower()
    for part in os.getenv("DEFAULT_EXPORT_FORMATS", "md,json,html,txt,yaml,doctags").split(",")
    if part.strip()
]
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "200"))
ALLOWED_EXPORT_FORMATS = {"md", "json", "html", "txt", "yaml", "doctags"}

INPUTS_DIR = WORKSPACE_ROOT / "inputs"
OUTPUTS_DIR = WORKSPACE_ROOT / "outputs"
MANIFESTS_DIR = WORKSPACE_ROOT / "manifests"

app = FastAPI(title=APP_TITLE, version="1.0.0")
converter = DocumentConverter()


class HealthResponse(BaseModel):
    status: str


class JobSummary(BaseModel):
    job_id: str
    created_at: str
    export_formats: list[str]
    outputs_dir: str
    manifest_path: str
    files: list[dict]


class ConvertRequestSummary(BaseModel):
    supported_export_formats: list[str]
    default_export_formats: list[str]
    max_upload_mb: int


def ensure_workspace() -> None:
    for path in (INPUTS_DIR, OUTPUTS_DIR, MANIFESTS_DIR):
        path.mkdir(parents=True, exist_ok=True)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sanitize_filename(name: str) -> str:
    cleaned = Path(name).name.strip()
    if not cleaned:
        return f"upload-{uuid.uuid4().hex}.bin"
    return cleaned


def job_paths(job_id: str) -> tuple[Path, Path, Path]:
    return INPUTS_DIR / job_id, OUTPUTS_DIR / job_id, MANIFESTS_DIR / f"{job_id}.json"


def normalize_export_formats(export_formats: str | None) -> list[str]:
    requested = DEFAULT_EXPORT_FORMATS if not export_formats else [
        part.strip().lower() for part in export_formats.split(",") if part.strip()
    ]
    invalid = sorted(set(requested) - ALLOWED_EXPORT_FORMATS)
    if invalid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Unsupported export format requested.",
                "invalid_formats": invalid,
                "allowed_formats": sorted(ALLOWED_EXPORT_FORMATS),
            },
        )
    if not requested:
        raise HTTPException(status_code=400, detail="At least one export format is required.")
    return requested


def write_upload(upload: UploadFile, target: Path) -> int:
    size = 0
    with target.open("wb") as handle:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_UPLOAD_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail=f"File '{upload.filename}' exceeds MAX_UPLOAD_MB={MAX_UPLOAD_MB}.",
                )
            handle.write(chunk)
    return size


def export_document(document, output_dir: Path, stem: str, formats: Iterable[str]) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    exported: dict[str, str] = {}

    for export_format in formats:
        if export_format == "md":
            target = output_dir / f"{stem}.md"
            target.write_text(document.export_to_markdown(), encoding="utf-8")
        elif export_format == "txt":
            target = output_dir / f"{stem}.txt"
            target.write_text(document.export_to_markdown(strict_text=True), encoding="utf-8")
        elif export_format == "json":
            target = output_dir / f"{stem}.json"
            target.write_text(json.dumps(document.export_to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        elif export_format == "yaml":
            target = output_dir / f"{stem}.yaml"
            target.write_text(yaml.safe_dump(document.export_to_dict(), sort_keys=False, allow_unicode=True), encoding="utf-8")
        elif export_format == "html":
            target = output_dir / f"{stem}.html"
            target.write_text(document.export_to_html(), encoding="utf-8")
        elif export_format == "doctags":
            target = output_dir / f"{stem}.doctags"
            target.write_text(document.export_to_doctags(), encoding="utf-8")
        else:
            continue
        exported[export_format] = str(target)

    return exported


@app.on_event("startup")
def startup_event() -> None:
    ensure_workspace()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    ensure_workspace()
    return HealthResponse(status="ok")


@app.get("/config", response_model=ConvertRequestSummary)
def config() -> ConvertRequestSummary:
    return ConvertRequestSummary(
        supported_export_formats=sorted(ALLOWED_EXPORT_FORMATS),
        default_export_formats=DEFAULT_EXPORT_FORMATS,
        max_upload_mb=MAX_UPLOAD_MB,
    )


@app.get("/jobs", response_model=list[JobSummary])
def list_jobs() -> list[JobSummary]:
    ensure_workspace()
    jobs: list[JobSummary] = []
    for manifest_path in sorted(MANIFESTS_DIR.glob("*.json"), reverse=True):
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        jobs.append(JobSummary(**data))
    return jobs


@app.get("/jobs/{job_id}", response_model=JobSummary)
def get_job(job_id: str) -> JobSummary:
    _, _, manifest_path = job_paths(job_id)
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobSummary(**json.loads(manifest_path.read_text(encoding="utf-8")))


@app.get("/jobs/{job_id}/artifacts/{relative_path:path}")
def get_artifact(job_id: str, relative_path: str):
    _, outputs_dir, _ = job_paths(job_id)
    target = (outputs_dir / relative_path).resolve()
    if not str(target).startswith(str(outputs_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid artifact path.")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return FileResponse(target)


@app.post("/convert", response_model=JobSummary)
def convert_documents(
    files: list[UploadFile] = File(...),
    export_formats: str | None = Form(default=None),
) -> JobSummary:
    ensure_workspace()

    normalized_formats = normalize_export_formats(export_formats)
    if not files:
        raise HTTPException(status_code=400, detail="At least one file upload is required.")

    job_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S") + f"-{uuid.uuid4().hex[:8]}"
    inputs_dir, outputs_dir, manifest_path = job_paths(job_id)
    inputs_dir.mkdir(parents=True, exist_ok=True)
    outputs_dir.mkdir(parents=True, exist_ok=True)

    file_summaries: list[dict] = []

    try:
        for upload in files:
            filename = sanitize_filename(upload.filename or "")
            input_path = inputs_dir / filename
            size_bytes = write_upload(upload, input_path)
            stem = input_path.stem
            file_output_dir = outputs_dir / stem

            summary = {
                "filename": filename,
                "input_path": str(input_path),
                "size_bytes": size_bytes,
                "status": "success",
                "exports": {},
                "error": None,
            }

            try:
                result = converter.convert(input_path)
                summary["exports"] = export_document(result.document, file_output_dir, stem, normalized_formats)
            except Exception as exc:  # pragma: no cover - runtime dependent
                summary["status"] = "failed"
                summary["error"] = str(exc)
                if file_output_dir.exists():
                    shutil.rmtree(file_output_dir, ignore_errors=True)

            file_summaries.append(summary)
    finally:
        for upload in files:
            upload.file.close()

    payload = JobSummary(
        job_id=job_id,
        created_at=utc_now(),
        export_formats=normalized_formats,
        outputs_dir=str(outputs_dir),
        manifest_path=str(manifest_path),
        files=file_summaries,
    )
    manifest_path.write_text(payload.model_dump_json(indent=2), encoding="utf-8")
    return payload


if __name__ == "__main__":
    import uvicorn

    ensure_workspace()
    uvicorn.run(app, host="0.0.0.0", port=API_PORT)
