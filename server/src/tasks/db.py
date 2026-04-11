from config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.database_url_sync,
            pool_size=2,
            max_overflow=0,
            pool_pre_ping=True,
        )
    return _engine


def get_sync_session() -> Session:
    return Session(_get_engine())
