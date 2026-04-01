from contextlib import asynccontextmanager

from cameras.models import Camera  # noqa: F401
from cameras.router import router as cameras_router
from config import STORAGE_PATH
from database import Base, engine
from exception import AppError
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from groups.models import Group  # noqa: F401
from groups.router import router as groups_router
from inspections.models import InspectionResult, InspectionSegmentResult  # noqa: F401
from inspections.router import router as inspections_router
from mls.models import MlModel  # noqa: F401
from mls.router import router as models_router
from segments.models import Segment, SegmentAnnotation, SegmentGroup  # noqa: F401
from segments.router import segment_group_router as segment_groups_router
from segments.router import segment_router as segments_router
from standards.models import Standard, StandardImage  # noqa: F401
from standards.router import router as standards_router
from users.models import User  # noqa: F401
from users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="База данных фотоэталонов API",
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

app.include_router(users_router)
app.include_router(groups_router)
app.include_router(standards_router)
app.include_router(segments_router)
app.include_router(segment_groups_router)
app.include_router(cameras_router)
app.include_router(inspections_router)
app.include_router(models_router)

STORAGE_PATH.mkdir(exist_ok=True)
(STORAGE_PATH / "standards").mkdir(exist_ok=True)
(STORAGE_PATH / "inspections").mkdir(exist_ok=True)
(STORAGE_PATH / "models").mkdir(exist_ok=True)

app.mount("/storage", StaticFiles(directory=STORAGE_PATH), name="storage")


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "OK"}
