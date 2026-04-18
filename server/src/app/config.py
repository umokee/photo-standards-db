from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    APP_NAME: str = "PhotoStandards API"
    DEBUG: bool = False

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "photo-standards"
    DB_USER: str = "postgres"
    DB_PASS: str = "postgres"  # noqa:S105

    STORAGE_ROOT: Path = Path("/storage")

    @property
    def database_url_async(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def database_url_conninfo(self) -> str:
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def standards_storage_path(self) -> Path:
        return self.STORAGE_ROOT / "standards"

    @property
    def inspections_storage_path(self) -> Path:
        return self.STORAGE_ROOT / "inspections"

    @property
    def models_storage_path(self) -> Path:
        return self.STORAGE_ROOT / "models"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


__all__ = ["settings"]
