from pathlib import Path
import subprocess
import yaml
from daemon.config import settings
from daemon.models.recipe import Recipe


_recipes: dict[str, Recipe] = {}


def _extract_recipe_slug_from_path(path_value: str) -> str | None:
    path = path_value.strip().replace('\\', '/')
    marker = 'registry/recipes/'
    if marker not in path:
        return None
    suffix = path.split(marker, 1)[1]
    parts = [part for part in suffix.split('/') if part]
    if not parts:
        return None
    return parts[0]


def _run_git(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=settings.base_dir,
        capture_output=True,
        text=True,
        check=False,
    )


def load_recipes() -> dict[str, Recipe]:
    global _recipes
    _recipes = {}
    registry = settings.registry_path
    if not registry.is_dir():
        return _recipes
    for recipe_dir in sorted(registry.iterdir()):
        yaml_path = recipe_dir / "recipe.yaml"
        if not yaml_path.is_file():
            continue
        try:
            with open(yaml_path, encoding="utf-8") as f:
                data = yaml.safe_load(f)
            recipe = Recipe(**data)
            _recipes[recipe.slug] = recipe
        except Exception as e:
            print(f"[registry] Failed to load {yaml_path}: {e}")
    print(f"[registry] Loaded {len(_recipes)} recipes")
    return _recipes


def get_recipes() -> dict[str, Recipe]:
    return _recipes


def get_recipe(slug: str) -> Recipe | None:
    return _recipes.get(slug)


def get_registry_recipe_dir(slug: str) -> Path | None:
    d = settings.registry_path / slug
    return d if d.is_dir() else None


def get_recipe_dir(slug: str) -> Path | None:
    fork_dir = settings.forks_path / slug
    state_path = fork_dir / "fork-state.json"
    fork_active = False
    if state_path.is_file():
        try:
            import json
            state = json.loads(state_path.read_text(encoding="utf-8")) or {}
            fork_active = bool(state.get("active"))
        except Exception:
            fork_active = False
    if fork_dir.is_dir() and fork_active:
        return fork_dir
    return get_registry_recipe_dir(slug)


def get_registry_status() -> dict:
    branch = ""
    head = ""
    head_subject = ""
    last_updated = ""
    dirty = False
    can_sync = False
    sync_error = ""

    git_dir = settings.base_dir / ".git"
    if not git_dir.exists():
        return {
            "available": False,
            "branch": branch,
            "head": head,
            "head_subject": head_subject,
            "last_updated": last_updated,
            "recipe_count": len(_recipes),
            "dirty": dirty,
            "can_sync": can_sync,
            "sync_error": "Git metadata is not available in this workspace.",
        }

    branch_proc = _run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    if branch_proc.returncode == 0:
        branch = branch_proc.stdout.strip()

    head_proc = _run_git(["rev-parse", "--short", "HEAD"])
    if head_proc.returncode == 0:
        head = head_proc.stdout.strip()

    subject_proc = _run_git(["log", "-1", "--pretty=%s"])
    if subject_proc.returncode == 0:
        head_subject = subject_proc.stdout.strip()

    date_proc = _run_git(["log", "-1", "--date=iso-strict", "--pretty=%cd"])
    if date_proc.returncode == 0:
        last_updated = date_proc.stdout.strip()

    dirty_proc = _run_git(["status", "--porcelain", "--untracked-files=no"])
    if dirty_proc.returncode == 0:
        dirty = bool(dirty_proc.stdout.strip())

    remote_proc = _run_git(["remote", "get-url", "origin"])
    if remote_proc.returncode == 0:
        can_sync = True
    else:
        sync_error = (remote_proc.stderr or remote_proc.stdout or "Git remote is not configured.").strip()

    return {
        "available": True,
        "branch": branch,
        "head": head,
        "head_subject": head_subject,
        "last_updated": last_updated,
        "recipe_count": len(_recipes),
        "dirty": dirty,
        "can_sync": can_sync,
        "sync_error": sync_error,
    }


def get_registry_delta() -> dict:
    status = get_registry_status()
    if not status["available"] or not status["can_sync"]:
        return {
            **status,
            "ahead": 0,
            "behind": 0,
            "registry_changed": False,
            "recent_commits": [],
        }

    upstream_ref = "@{upstream}"
    upstream_proc = _run_git(["rev-parse", "--abbrev-ref", upstream_ref])
    if upstream_proc.returncode != 0:
        return {
            **status,
            "ahead": 0,
            "behind": 0,
            "registry_changed": False,
            "recent_commits": [],
            "sync_error": (upstream_proc.stderr or upstream_proc.stdout or "Upstream branch is not configured.").strip(),
        }

    ahead = 0
    behind = 0
    counts_proc = _run_git(["rev-list", "--left-right", "--count", f"HEAD...{upstream_ref}"])
    if counts_proc.returncode == 0:
        parts = counts_proc.stdout.strip().split()
        if len(parts) == 2:
            ahead = int(parts[0])
            behind = int(parts[1])

    commits_proc = _run_git([
        "log",
        "--pretty=%h\t%cd\t%s",
        "--date=short",
        f"HEAD..{upstream_ref}",
        "-5",
    ])
    recent_commits = []
    if commits_proc.returncode == 0:
        for line in commits_proc.stdout.splitlines():
            if not line.strip():
                continue
            parts = line.split("\t", 2)
            if len(parts) == 3:
                recent_commits.append({
                    "sha": parts[0],
                    "date": parts[1],
                    "subject": parts[2],
                })

    changed_files_proc = _run_git([
        "diff",
        "--name-only",
        "HEAD..@{upstream}",
        "--",
        "registry/recipes",
    ])
    changed_recipe_slugs: list[str] = []
    if changed_files_proc.returncode == 0:
        seen: set[str] = set()
        for line in changed_files_proc.stdout.splitlines():
            slug = _extract_recipe_slug_from_path(line)
            if slug and slug not in seen:
                changed_recipe_slugs.append(slug)
                seen.add(slug)

    recipe_commit_log_proc = _run_git([
        "log",
        "--name-only",
        "--pretty=%H\t%h\t%cd\t%s",
        "--date=short",
        f"HEAD..{upstream_ref}",
        "--",
        "registry/recipes",
    ])
    recipe_deltas: dict[str, list[dict]] = {}
    if recipe_commit_log_proc.returncode == 0:
        current_commit: dict | None = None
        for raw_line in recipe_commit_log_proc.stdout.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if '\t' in line:
                parts = line.split('\t', 3)
                if len(parts) == 4:
                    current_commit = {
                        "sha": parts[1],
                        "date": parts[2],
                        "subject": parts[3],
                    }
                continue
            if not current_commit:
                continue
            slug = _extract_recipe_slug_from_path(line)
            if not slug:
                continue
            entries = recipe_deltas.setdefault(slug, [])
            if not any(entry["sha"] == current_commit["sha"] for entry in entries):
                entries.append(current_commit)

    return {
        **status,
        "ahead": ahead,
        "behind": behind,
        "registry_changed": behind > 0,
        "recent_commits": recent_commits,
        "changed_recipe_slugs": changed_recipe_slugs,
        "recipe_deltas": recipe_deltas,
    }


def sync_registry() -> dict:
    status = get_registry_status()
    if not status["available"]:
        return {
            **status,
            "synced": False,
        }

    if not status["can_sync"]:
        return {
            **status,
            "synced": False,
        }

    fetch_proc = _run_git(["fetch", "--all", "--prune"])
    if fetch_proc.returncode != 0:
        return {
            **get_registry_delta(),
            "synced": False,
            "sync_error": (fetch_proc.stderr or fetch_proc.stdout or "git fetch failed").strip(),
        }

    pull_proc = _run_git(["pull", "--ff-only"])
    if pull_proc.returncode != 0:
        return {
            **get_registry_delta(),
            "synced": False,
            "sync_error": (pull_proc.stderr or pull_proc.stdout or "git pull failed").strip(),
        }

    load_recipes()
    return {
        **get_registry_delta(),
        "synced": True,
        "sync_output": "\n".join(part.strip() for part in [fetch_proc.stdout, pull_proc.stdout] if part.strip()),
    }
