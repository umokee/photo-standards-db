from fastapi import status


class AppError(Exception):
    def __init__(
        self,
        message: str,
        code: str = "APP_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class NotFoundError(AppError):
    def __init__(
        self,
        entity: str,
        entity_id: str,
        verb: str = "не найден",
    ) -> None:
        super().__init__(
            message=f"{entity} с id {entity_id} {verb}",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"entity": entity, "id": str(entity_id)},
        )


class ConflictError(AppError):
    def __init__(
        self,
        message: str,
        details: str | None = None,
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
        message: str,
        details: str | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )
