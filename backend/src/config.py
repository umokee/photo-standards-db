from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PATH = str(Path(__file__).parent.parent / ".env")
STORAGE_PATH = Path(__file__).parent.parent.parent / "storage"


class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASS: str
    DB_NAME: str

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    model_config = SettingsConfigDict(env_file=ENV_PATH)


settings = Settings()
