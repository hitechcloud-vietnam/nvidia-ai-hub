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
    fork_bundles_path: Path = Path(__file__).resolve().parent.parent / "data" / "fork-bundles"
    deployments_path: Path = Path(__file__).resolve().parent.parent / "data" / "deployments"
    cluster_path: Path = Path(__file__).resolve().parent.parent / "data" / "cluster"
    backups_path: Path = Path(__file__).resolve().parent.parent / "data" / "backups"

    model_config = {
        "env_prefix": "NVIDIA_AI_HUB_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.community_exports_path.mkdir(parents=True, exist_ok=True)
settings.forks_path.mkdir(parents=True, exist_ok=True)
settings.fork_bundles_path.mkdir(parents=True, exist_ok=True)
settings.deployments_path.mkdir(parents=True, exist_ok=True)
settings.cluster_path.mkdir(parents=True, exist_ok=True)
settings.backups_path.mkdir(parents=True, exist_ok=True)
