from config import settings
from procrastinate import App, PsycopgConnector

app = App(
    connector=PsycopgConnector(
        conninfo=settings.database_url_conninfo,
    ),
    import_paths=[
        "tasks.training",
    ],
)
