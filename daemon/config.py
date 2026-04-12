from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 9000
    host: str = "0.0.0.0"
    base_dir: Path = Path(__file__).resolve().parent.parent
    registry_path: Path = Path(__file__).resolve().parent.parent / "registry" / "recipes"
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    db_path: Path = Path(__file__).resolve().parent.parent / "data" / "spark-ai-hub.db"

    model_config = {"env_prefix": "SPARK_AI_HUB_", "env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("registry_path", "data_dir", "db_path", mode="before")
    @classmethod
    def resolve_relative_paths(cls, value):
        if value is None:
            return value

        path = Path(value)
        if path.is_absolute():
            return path

        return Path(__file__).resolve().parent.parent / path


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
