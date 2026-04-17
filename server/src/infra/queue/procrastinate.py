from app.config import settings
from procrastinate import App, PsycopgConnector

procrastinate_app = App(
    connector=PsycopgConnector(
        conninfo=settings.database_url_conninfo,
    ),
    import_paths=[
        "modules.training.jobs",
        "modules.inspections.jobs",
        "modules.tasks.jobs",
    ],
    worker_defaults={
        "delete_jobs": "successful",
        "fetch_job_polling_interval": 2.0,
        "update_heartbeat_interval": 10.0,
        "stalled_worker_timeout": 30.0,
    },
)

__all__ = ["procrastinate_app"]
