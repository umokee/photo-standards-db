from config import settings
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

engine = create_async_engine(
    url=settings.database_url,
    echo=False,
    pool_pre_ping=True,
)


class Base(DeclarativeBase):
    pass


Session = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)


async def get_session():
    db = Session()
    try:
        yield db
    finally:
        await db.close()
