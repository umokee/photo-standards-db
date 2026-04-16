import asyncio
from logging.config import fileConfig

from alembic import context
from app.config import settings
from app.db import Base
from modules.cameras.models import Camera  # noqa: F401
from modules.groups.models import Group  # noqa: F401
from modules.inspections.models import (  # noqa: F401
    InspectionResult,
    InspectionSegmentResult,
)
from modules.ml_models.models import MlModel  # noqa: F401
from modules.segments.models import (  # noqa: F401
    Segment,
    SegmentAnnotation,
    SegmentGroup,
)
from modules.standards.models import Standard, StandardImage  # noqa: F401
from modules.tasks.models import Task  # noqa: F401
from modules.users.models import User  # noqa: F401
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.database_url_async)


def include_name(name, type_, parent_names) -> bool:
    if type_ == "table" and name.startswith("procrastinate_"):
        return False
    return True


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_name=include_name,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=False,
        include_name=include_name,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
