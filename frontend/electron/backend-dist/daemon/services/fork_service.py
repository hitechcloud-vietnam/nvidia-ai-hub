from __future__ import annotations

import json
import shutil
import zipfile
from datetime import datetime, timezone
from difflib import unified_diff
from pathlib import Path

from daemon.config import settings
from daemon.services.registry_service import get_registry_recipe_dir
from daemon.services.community_service import community_yaml_path_for_slug, export_recipe_community_yaml


def _read_text_if_exists(path: Path) -> str:
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


def _diff_stats(base_text: str, candidate_text: str) -> dict:
    base_lines = base_text.splitlines()
    candidate_lines = candidate_text.splitlines()
    added = 0
    removed = 0
    changed = 0

    for line in unified_diff(base_lines, candidate_lines, lineterm=""):
        if line.startswith(("---", "+++", "@@")):
            continue
        if line.startswith("+"):
            added += 1
        elif line.startswith("-"):
            removed += 1

    changed = min(added, removed)
    return {
        "added_lines": added,
        "removed_lines": removed,
        "changed_lines": changed,
        "total_delta": added + removed,
    }


def _tracked_file_map() -> list[tuple[str, str]]:
    return [
        ("recipe", "recipe.yaml"),
        ("compose", "docker-compose.yml"),
        ("env", ".env"),
    ]


def _resolve_registry_source(registry_dir: Path, key: str, file_name: str) -> Path:
    registry_source = registry_dir / file_name
    if key == "env" and not registry_source.is_file():
        registry_source = registry_dir / ".env.example"
    return registry_source


def _build_unified_diff_text(base_text: str, candidate_text: str, from_name: str, to_name: str) -> str:
    return "\n".join(
        unified_diff(
            base_text.splitlines(),
            candidate_text.splitlines(),
            fromfile=from_name,
            tofile=to_name,
            lineterm="",
        )
    )


def get_recipe_fork_diff_summary(slug: str) -> dict:
    registry_dir = get_registry_recipe_dir(slug)
    fork_dir = settings.forks_path / slug
    if not registry_dir:
        raise FileNotFoundError(f"Recipe not found: {slug}")
    if not fork_dir.is_dir():
        raise FileNotFoundError(f"Fork not found: {slug}")

    files: list[dict] = []
    changed_files = 0
    for key, file_name in _tracked_file_map():
        registry_source = _resolve_registry_source(registry_dir, key, file_name)
        fork_source = fork_dir / file_name

        registry_exists = registry_source.is_file()
        fork_exists = fork_source.is_file()
        registry_text = _read_text_if_exists(registry_source)
        fork_text = _read_text_if_exists(fork_source)
        identical = registry_exists and fork_exists and registry_text == fork_text
        stats = _diff_stats(registry_text, fork_text) if registry_exists and fork_exists else {
            "added_lines": len(fork_text.splitlines()) if fork_exists else 0,
            "removed_lines": len(registry_text.splitlines()) if registry_exists else 0,
            "changed_lines": 0,
            "total_delta": len(fork_text.splitlines()) + len(registry_text.splitlines()),
        }
        status = "unchanged" if identical else "changed"
        if not registry_exists and fork_exists:
            status = "fork-only"
        elif registry_exists and not fork_exists:
            status = "missing-from-fork"

        if status != "unchanged":
            changed_files += 1

        files.append(
            {
                "key": key,
                "name": file_name,
                "status": status,
                "registry_exists": registry_exists,
                "fork_exists": fork_exists,
                **stats,
            }
        )

    return {
        "slug": slug,
        "summary": {
            "changed_files": changed_files,
            "total_files": len(files),
            "active": bool(_read_fork_state(slug).get("active")),
        },
        "files": files,
    }


def get_recipe_fork_full_diff(slug: str) -> dict:
    registry_dir = get_registry_recipe_dir(slug)
    fork_dir = settings.forks_path / slug
    if not registry_dir:
        raise FileNotFoundError(f"Recipe not found: {slug}")
    if not fork_dir.is_dir():
        raise FileNotFoundError(f"Fork not found: {slug}")

    files: list[dict] = []
    for key, file_name in _tracked_file_map():
        registry_source = _resolve_registry_source(registry_dir, key, file_name)
        fork_source = fork_dir / file_name
        registry_exists = registry_source.is_file()
        fork_exists = fork_source.is_file()
        registry_text = _read_text_if_exists(registry_source)
        fork_text = _read_text_if_exists(fork_source)
        diff_text = _build_unified_diff_text(
            registry_text,
            fork_text,
            f"registry/{registry_source.name}",
            f"fork/{file_name}",
        )
        files.append(
            {
                "key": key,
                "name": file_name,
                "registry_exists": registry_exists,
                "fork_exists": fork_exists,
                "has_changes": bool(diff_text),
                "diff": diff_text,
            }
        )

    return {
        "slug": slug,
        "summary": get_recipe_fork_diff_summary(slug)["summary"],
        "files": files,
    }


def build_recipe_fork_manifest_markdown_summary(slug: str) -> str:
    fork_dir = settings.forks_path / slug
    if not fork_dir.is_dir():
        raise FileNotFoundError(f"Fork not found: {slug}")

    included_files = ["bundle-manifest.json"]
    for file_name in ("recipe.yaml", "docker-compose.yml", ".env", "fork-state.json"):
        if (fork_dir / file_name).is_file():
            included_files.append(file_name)
    community_path = community_yaml_path_for_slug(slug)
    if community_path.is_file():
        included_files.append("community.yaml")

    manifest = _build_bundle_manifest(
        slug,
        included_files,
        settings.fork_bundles_path / slug / f"{slug}-fork-bundle.zip",
        community_path,
    )
    diff_summary = manifest["diff_summary"]
    lines = [
        f"## Fork bundle summary — `{slug}`",
        "",
        f"- Bundle file: `{manifest['bundle_file']}`",
        f"- Generated at: `{manifest['generated_at']}`",
        f"- Fork overlay active: `{str(manifest['fork']['active']).lower()}`",
        f"- Changed tracked files: `{diff_summary['summary']['changed_files']}/{diff_summary['summary']['total_files']}`",
        f"- Included files: {', '.join(f'`{name}`' for name in manifest['included_files'])}",
        "",
        "### Reviewer summary",
        "",
        f"- {manifest['reviewer_summary']['headline']}",
    ]

    for note in manifest["reviewer_summary"]["notes"]:
        lines.append(f"- {note}")

    lines.extend([
        "",
        "### Registry vs fork diff",
        "",
        "| File | Status | Added | Removed | Changed |",
        "| --- | --- | ---: | ---: | ---: |",
    ])

    for file in diff_summary["files"]:
        lines.append(
            f"| `{file['name']}` | {file['status']} | {file['added_lines']} | {file['removed_lines']} | {file['changed_lines']} |"
        )

    lines.extend([
        "",
        "### Validation",
        "",
        "- Backend validation: `python -m compileall daemon`",
        "- Frontend validation: `npm run lint`",
        "- Frontend production build: `npm run build`",
        "- Runtime Docker behavior was not revalidated in this workspace.",
    ])

    return "\n".join(lines)


def _build_bundle_manifest(slug: str, included_files: list[str], bundle_path: Path, community_path: Path) -> dict:
    diff_summary = get_recipe_fork_diff_summary(slug)
    return {
        "manifest_version": 1,
        "slug": slug,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "bundle_file": bundle_path.name,
        "included_files": included_files,
        "fork": get_recipe_fork_status(slug),
        "community_yaml": {
            "path": str(community_path),
            "included": "community.yaml" in included_files,
        },
        "diff_summary": diff_summary,
        "reviewer_summary": {
            "headline": f"{diff_summary['summary']['changed_files']} of {diff_summary['summary']['total_files']} tracked files differ from registry",
            "notes": [
                "Compare recipe metadata, compose wiring, and runtime env overrides before submission.",
                "Community metadata is exported separately as community.yaml for registry-compatible review.",
            ],
        },
    }


def _fork_dir(slug: str) -> Path:
    path = settings.forks_path / slug
    path.mkdir(parents=True, exist_ok=True)
    return path


def _fork_state_path(slug: str) -> Path:
    return settings.forks_path / slug / "fork-state.json"


def _read_fork_state(slug: str) -> dict:
    state_path = _fork_state_path(slug)
    if not state_path.is_file():
        return {"active": False}
    try:
        return json.loads(state_path.read_text(encoding="utf-8")) or {"active": False}
    except (OSError, json.JSONDecodeError):
        return {"active": False}


def _write_fork_state(slug: str, *, active: bool) -> None:
    state_path = _fork_state_path(slug)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps({"active": active}, indent=2), encoding="utf-8")


def _copy_if_exists(source: Path, destination: Path) -> bool:
    if not source.is_file():
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    return True


def save_recipe_fork(slug: str) -> dict:
    recipe_dir = get_registry_recipe_dir(slug)
    if not recipe_dir:
        raise FileNotFoundError(f"Recipe not found: {slug}")

    fork_dir = _fork_dir(slug)
    compose_source = recipe_dir / "docker-compose.yml"
    env_source = recipe_dir / ".env"
    env_template = recipe_dir / ".env.example"
    recipe_source = recipe_dir / "recipe.yaml"

    compose_saved = _copy_if_exists(compose_source, fork_dir / "docker-compose.yml")
    recipe_saved = _copy_if_exists(recipe_source, fork_dir / "recipe.yaml")
    env_saved = _copy_if_exists(env_source if env_source.is_file() else env_template, fork_dir / ".env")
    _write_fork_state(slug, active=True)

    return {
        "slug": slug,
        "fork_dir": str(fork_dir),
        "active": True,
        "files": {
            "recipe": recipe_saved,
            "compose": compose_saved,
            "env": env_saved,
        },
    }


def get_recipe_fork_status(slug: str) -> dict:
    fork_dir = settings.forks_path / slug
    state = _read_fork_state(slug)
    return {
        "slug": slug,
        "exists": fork_dir.is_dir(),
        "active": bool(state.get("active")) and fork_dir.is_dir(),
        "fork_dir": str(fork_dir),
        "files": {
            "recipe": (fork_dir / "recipe.yaml").is_file(),
            "compose": (fork_dir / "docker-compose.yml").is_file(),
            "env": (fork_dir / ".env").is_file(),
        },
    }


def activate_recipe_fork(slug: str) -> dict:
    fork_dir = settings.forks_path / slug
    if not fork_dir.is_dir():
        raise FileNotFoundError(f"Fork not found: {slug}")
    _write_fork_state(slug, active=True)
    return get_recipe_fork_status(slug)


def deactivate_recipe_fork(slug: str) -> dict:
    fork_dir = settings.forks_path / slug
    if not fork_dir.is_dir():
        raise FileNotFoundError(f"Fork not found: {slug}")
    _write_fork_state(slug, active=False)
    return get_recipe_fork_status(slug)


def delete_recipe_fork(slug: str) -> dict:
    fork_dir = settings.forks_path / slug
    if not fork_dir.is_dir():
        raise FileNotFoundError(f"Fork not found: {slug}")
    shutil.rmtree(fork_dir)
    return {
        "slug": slug,
        "exists": False,
        "active": False,
        "fork_dir": str(fork_dir),
        "files": {
            "recipe": False,
            "compose": False,
            "env": False,
        },
    }


async def export_recipe_fork_bundle(slug: str) -> dict:
    fork_dir = settings.forks_path / slug
    if not fork_dir.is_dir():
        raise FileNotFoundError(f"Fork not found: {slug}")

    community_path = await export_recipe_community_yaml(slug)
    bundle_dir = settings.fork_bundles_path / slug
    bundle_dir.mkdir(parents=True, exist_ok=True)
    bundle_path = bundle_dir / f"{slug}-fork-bundle.zip"
    manifest_path = bundle_dir / "bundle-manifest.json"

    included_files: list[str] = ["bundle-manifest.json"]
    bundle_sources: list[tuple[Path, str]] = []
    for file_name in ("recipe.yaml", "docker-compose.yml", ".env", "fork-state.json"):
        source = fork_dir / file_name
        if source.is_file():
            bundle_sources.append((source, file_name))
            included_files.append(file_name)

    if community_path.is_file():
        bundle_sources.append((community_path, "community.yaml"))
        included_files.append("community.yaml")

    manifest = _build_bundle_manifest(slug, included_files, bundle_path, community_path)
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        bundle.writestr("bundle-manifest.json", json.dumps(manifest, indent=2))
        for source, arcname in bundle_sources:
            bundle.write(source, arcname=arcname)

    return {
        "slug": slug,
        "bundle_path": str(bundle_path),
        "bundle_dir": str(bundle_dir),
        "manifest_path": str(manifest_path),
        "manifest": manifest,
        "included_files": included_files,
        "community_path": str(community_yaml_path_for_slug(slug)),
    }