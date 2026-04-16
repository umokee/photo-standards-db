from app.config import settings
from procrastinate import App, PsycopgConnector

procrastinate_app = App(
    connector=PsycopgConnector(
        conninfo=settings.database_url_conninfo,
    ),
    import_paths=[
        "modules.training.jobs",
        "modules.inspections.jobs",
    ],
)

app = procrastinate_app
