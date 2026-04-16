from __future__ import annotations

import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from app.config import settings
from app.db import Base
from app.import_models import import_models
from infra.queue.procrastinate import procrastinate_app
from sqlalchemy import create_engine, inspect


def build_alembic_config() -> Config:
    project_root = Path(__file__).resolve().parents[1]
    cfg = Config(str(project_root / "alembic.ini"))
    cfg.set_main_option("script_location", str(project_root / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url_sync)
    return cfg


def bootstrap_database() -> None:
    import_models()
    engine = create_engine(
        settings.database_url_sync,
        pool_pre_ping=True,
        future=True,
    )

    alembic_cfg = build_alembic_config()

    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        model_tables = {table.name for table in Base.metadata.sorted_tables}

        has_any_model_tables = bool(existing_tables & model_tables)
        has_alembic_version = "alembic_version" in existing_tables

        if not has_any_model_tables:
            Base.metadata.create_all(bind=engine, checkfirst=True)
            command.stamp(alembic_cfg, "head")
            print(
                "Бутстрап БД: создана схема через create_all и выполнен stamp до head"
            )
            return

        if has_any_model_tables and not has_alembic_version:
            command.stamp(alembic_cfg, "head")
            print("Бутстрап БД: обнаружена существующая схема, выполнен stamp до head")
            return

        command.upgrade(alembic_cfg, "head")
        print("Бутстрап БД: применены миграции до head")

    finally:
        engine.dispose()


def bootstrap_procrastinate() -> None:
    engine = create_engine(
        settings.database_url_sync,
        pool_pre_ping=True,
        future=True,
    )

    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        if "procrastinate_jobs" in existing_tables:
            print("Бутстрап Procrastinate: схема уже существует")
            return
    finally:
        engine.dispose()

    procrastinate_app.open()
    try:
        procrastinate_app.schema_manager.apply_schema()
    finally:
        procrastinate_app.close()

    print("Бутстрап Procrastinate: схема применена")


if __name__ == "__main__":
    try:
        bootstrap_database()
        bootstrap_procrastinate()
    except Exception as exc:
        print(f"Ошибка бутстрапа: {exc}", file=sys.stderr)
        raise
