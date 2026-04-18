from app.config import settings
from app.import_models import import_models
from procrastinate import App, PsycopgConnector

import_models()

procrastinate_app = App(
    connector=PsycopgConnector(
        conninfo=settings.database_url_conninfo,
    ),
    import_paths=[
        "infra.queue.reconciler",
        "infra.queue.maintenance",
        "modules.training.jobs",
        "modules.inspections.jobs",
    ],
    worker_defaults={
        "delete_jobs": "successful",
        "fetch_job_polling_interval": 2.0,
        "update_heartbeat_interval": 10.0,
        "stalled_worker_timeout": 30.0,
    },
)

__all__ = ["procrastinate_app"]
