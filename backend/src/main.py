from contextlib import asynccontextmanager

from config import STORAGE_PATH
from database import Base, engine
from exception import AppError
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from models import *

from backend.src.cameras import router
from backend.src.groups import router
from backend.src.images import (
    router,
)
from backend.src.inspections import routes
from backend.src.segment_groups import routes
from backend.src.segments import router
from backend.src.standards import router
from backend.src.users import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Photo Standards DB",
    lifespan=lifespan,
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = " - ".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append(
            {
                "field": field,
                "message": error["msg"],
                "type": error["type"],
            }
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Ошибка валидации данных",
            "details": {"errors": errors},
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router.router)
app.include_router(router.router)
app.include_router(router.router)
app.include_router(router.router)
app.include_router(router.router)
app.include_router(router.router)
app.include_router(router.router)
app.include_router(router.router)

STORAGE_PATH.mkdir(exist_ok=True)
(STORAGE_PATH / "standards").mkdir(exist_ok=True)
(STORAGE_PATH / "inspections").mkdir(exist_ok=True)
(STORAGE_PATH / "models").mkdir(exist_ok=True)

app.mount("/storage", StaticFiles(directory=STORAGE_PATH), name="storage")


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "OK"}
