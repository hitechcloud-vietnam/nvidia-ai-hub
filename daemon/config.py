from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 9000
    host: str = "0.0.0.0"
    base_dir: Path = Path(__file__).resolve().parent.parent
    registry_path: Path = Path(__file__).resolve().parent.parent / "registry" / "recipes"
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    db_path: Path = Path(__file__).resolve().parent.parent / "data" / "nvidia-ai-hub.db"
    community_exports_path: Path = Path(__file__).resolve().parent.parent / "data" / "community"
    forks_path: Path = Path(__file__).resolve().parent.parent / "data" / "forks"

    model_config = {"env_prefix": "NVIDIA_AI_HUB_"}


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.community_exports_path.mkdir(parents=True, exist_ok=True)
settings.forks_path.mkdir(parents=True, exist_ok=True)
