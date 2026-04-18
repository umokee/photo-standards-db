from contextlib import asynccontextmanager

from app.config import settings
from app.db import dispose_engines
from app.exception_handlers import register_exception_handlers
from app.import_models import import_models
from app.logging import configure_logging
from app.router import api_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


def ensure_storage_dirs() -> None:
    settings.STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    settings.standards_storage_path.mkdir(parents=True, exist_ok=True)
    settings.inspections_storage_path.mkdir(parents=True, exist_ok=True)
    settings.models_storage_path.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_storage_dirs()
    import_models()
    try:
        yield
    finally:
        await dispose_engines()


def create_app() -> FastAPI:
    configure_logging(debug=settings.DEBUG)

    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(api_router)
    app.mount("/storage", StaticFiles(directory=settings.STORAGE_ROOT), name="storage")
    app.state.settings = settings
    return app


app = create_app()
