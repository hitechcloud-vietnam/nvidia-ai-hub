from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 9000
    host: str = "0.0.0.0"
    base_dir: Path | None = None
    registry_path: Path | None = None
    frontend_dist_path: Path | None = None
    data_dir: Path | None = None
    db_path: Path | None = None
    community_exports_path: Path | None = None
    forks_path: Path | None = None
    fork_bundles_path: Path | None = None
    deployments_path: Path | None = None
    cluster_path: Path | None = None
    backups_path: Path | None = None

    model_config = {
        "env_prefix": "NVIDIA_AI_HUB_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    @model_validator(mode="after")
    def resolve_paths(self):
        default_base_dir = Path(__file__).resolve().parent.parent
        self.base_dir = Path(self.base_dir or default_base_dir)
        self.registry_path = Path(self.registry_path or (self.base_dir / "registry" / "recipes"))
        self.frontend_dist_path = Path(self.frontend_dist_path or (self.base_dir / "frontend" / "dist"))
        self.data_dir = Path(self.data_dir or (self.base_dir / "data"))
        self.db_path = Path(self.db_path or (self.data_dir / "nvidia-ai-hub.db"))
        self.community_exports_path = Path(self.community_exports_path or (self.data_dir / "community"))
        self.forks_path = Path(self.forks_path or (self.data_dir / "forks"))
        self.fork_bundles_path = Path(self.fork_bundles_path or (self.data_dir / "fork-bundles"))
        self.deployments_path = Path(self.deployments_path or (self.data_dir / "deployments"))
        self.cluster_path = Path(self.cluster_path or (self.data_dir / "cluster"))
        self.backups_path = Path(self.backups_path or (self.data_dir / "backups"))
        return self


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.community_exports_path.mkdir(parents=True, exist_ok=True)
settings.forks_path.mkdir(parents=True, exist_ok=True)
settings.fork_bundles_path.mkdir(parents=True, exist_ok=True)
settings.deployments_path.mkdir(parents=True, exist_ok=True)
settings.cluster_path.mkdir(parents=True, exist_ok=True)
settings.backups_path.mkdir(parents=True, exist_ok=True)
