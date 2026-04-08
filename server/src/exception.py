from typing import Any

from fastapi import status


class AppError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str,
        status_code: int,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

    def to_response(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "status": self.status_code,
            "details": self.details,
        }


class NotFoundError(AppError):
    def __init__(
        self,
        entity_label: str,
        entity: str,
        entity_id: Any | None = None,
    ) -> None:
        details: dict[str, Any] = {
            "entity": entity,
            "entity_label": entity_label,
        }
        if entity_id is not None:
            details["id"] = str(entity_id)

        super().__init__(
            message=f"{entity_label} не найден",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictError(AppError):
    def __init__(
        self,
        message: str = "Возник конфликт данных",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class ValidationError(AppError):
    def __init__(
        self,
        message: str = "Проверьте введенные данные",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class UnauthorizedError(AppError):
    def __init__(
        self,
        message: str = "Необходима авторизация",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class ForbiddenError(AppError):
    def __init__(
        self,
        message: str = "Недостаточно прав",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class InternalServerError(AppError):
    def __init__(
        self,
        message: str = "Внутренняя ошибка сервера",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="INTERNAL_SERVER_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )
