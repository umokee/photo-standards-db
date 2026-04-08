import logging
from contextlib import asynccontextmanager
from typing import Any

from cameras.models import Camera  # noqa: F401
from cameras.router import router as cameras_router
from config import STORAGE_PATH
from database import Base, engine
from exception import AppError, InternalServerError, ValidationError
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from groups.models import Group  # noqa: F401
from groups.router import router as groups_router
from inspections.models import InspectionResult, InspectionSegmentResult  # noqa: F401
from inspections.router import router as inspections_router
from mls import worker
from mls.models import MlModel, TrainingTask  # noqa: F401
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
    worker.start()
    yield
    worker.stop()


app = FastAPI(
    title="База данных фотоэталонов API",
    lifespan=lifespan,
)

logger = logging.getLogger(__name__)


def _json_error_response(error: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content=error.to_response(),
    )


def _normalize_error_field(loc: tuple[Any, ...]) -> str:
    parts = [str(part) for part in loc if part not in {"body", "query", "path"}]
    return ".".join(parts)


def _translate_validation_message(error_type: str, message: str) -> str:
    ru_messages = {
        "missing": "Поле обязательно",
        "string_too_short": "Слишком короткое значение",
        "string_too_long": "Слишком длинное значение",
        "string_pattern_mismatch": "Некорректный формат",
        "string_type": "Ожидается строка",
        "int_parsing": "Некорректное число",
        "int_type": "Ожидается число",
        "float_parsing": "Некорректное число",
        "float_type": "Ожидается число",
        "bool_parsing": "Некорректное булево значение",
        "bool_type": "Ожидается булево значение",
        "uuid_parsing": "Некорректный идентификатор",
        "uuid_type": "Некорректный идентификатор",
        "literal_error": "Недопустимое значение",
        "enum": "Недопустимое значение",
        "greater_than": "Значение слишком маленькое",
        "greater_than_equal": "Значение слишком маленькое",
        "less_than": "Значение слишком большое",
        "less_than_equal": "Значение слишком большое",
        "list_type": "Ожидается список",
        "dict_type": "Ожидается объект",
    }

    if error_type in ru_messages:
        return ru_messages[error_type]

    lowered = message.lower()
    if lowered == "field required":
        return "Поле обязательно"

    return "Некорректное значение"


def _build_validation_errors(exc: RequestValidationError) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []

    for error in exc.errors():
        error_type = error["type"]
        field = _normalize_error_field(error["loc"])
        errors.append(
            {
                "field": field,
                "message": _translate_validation_message(error_type, error["msg"]),
                "type": error_type,
            }
        )

    return errors


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return _json_error_response(exc)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    error = ValidationError(
        message="Проверьте введенные данные",
        details={"errors": _build_validation_errors(exc)},
    )
    return _json_error_response(error)


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled error on %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return _json_error_response(InternalServerError())


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
