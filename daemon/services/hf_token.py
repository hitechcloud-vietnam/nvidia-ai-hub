"""HuggingFace token storage.

Source of truth is the Hub's data dir so the token has a clean lifecycle
(uninstall removes it, backups are scoped to the Hub directory). On read we
fall back to the standard `~/.cache/huggingface/token` path if the Hub-local
file is missing — this lets users who already ran `huggingface-cli login`
reuse their existing token without re-entering it.
"""

from pathlib import Path

from daemon.config import settings


HUB_TOKEN_PATH = settings.data_dir / "hf-token"
SYSTEM_TOKEN_PATH = Path.home() / ".cache" / "huggingface" / "token"


def read_token() -> str:
    """Return the active HF token, or empty string if none is configured."""
    for path in (HUB_TOKEN_PATH, SYSTEM_TOKEN_PATH):
        if path.is_file():
            value = path.read_text().strip()
            if value:
                return value
    return ""


def has_token() -> bool:
    return read_token() != ""


def write_token(token: str) -> None:
    HUB_TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    HUB_TOKEN_PATH.write_text(token.strip())
    HUB_TOKEN_PATH.chmod(0o600)


def clear_token() -> None:
    if HUB_TOKEN_PATH.is_file():
        HUB_TOKEN_PATH.unlink()