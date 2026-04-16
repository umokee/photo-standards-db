import logging
from typing import Any

from app.exception import AppError, InternalServerError, ValidationError
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.errors")


_VALIDATION_MESSAGES: dict[str, str] = {
    "missing": "Поле обязательно",
    "string_too_short": "Слишком короткое значение",
    "string_too_long": "Слишком длинное значение",
    "value_error": "Некорректное значение",
    "int_parsing": "Ожидалось целое число",
    "bool_parsing": "Ожидалось булево значение",
}


def _normalize_error_field(loc: tuple[Any, ...]) -> str:
    filtered = [str(item) for item in loc if item not in {"body", "query", "path"}]
    return ".".join(filtered) if filtered else "non_field_error"


def _translate_validation_message(error_type: str, fallback: str) -> str:
    return _VALIDATION_MESSAGES.get(error_type, fallback)


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


def _json_error_response(exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return _json_error_response(exc)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        error = ValidationError(
            message="Проверьте введённые данные",
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
