from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PATH = str(Path(__file__).parent.parent / ".env")
STORAGE_PATH = Path(__file__).parent.parent.parent / "storage"
MAX_TRAIN_RATIO = 80
MAX_SUM_TRAIN_VAL_RATIO = 90
ACTIVE_TASK_STATUSES = ("pending", "preparing", "training", "saving")
FALLBACK_POLL_INTERVAL = 60
RESTART_DELAY = 5
MAX_RESTART_DELAY = 120


class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASS: str
    DB_NAME: str

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def database_url_sync(self) -> str:
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    model_config = SettingsConfigDict(env_file=ENV_PATH)


settings = Settings()
