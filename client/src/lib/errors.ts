export type ApiFieldError = {
  field: string;
  message: string;
  type: string;
};

export type ApiErrorDetails = {
  errors?: ApiFieldError[];
  entity?: string;
  entity_label?: string;
  field?: string;
  value?: string;
  id?: string;
  [key: string]: unknown;
};

export const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "Произошла ошибка";
};

export const getFieldErrors = (error: unknown): ApiFieldError[] => {
  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof error.details === "object" &&
    error.details !== null &&
    "errors" in error.details &&
    Array.isArray(error.details.errors)
  ) {
    return error.details.errors as ApiFieldError[];
  }

  return [];
};

export const getFieldErrorMap = (error: unknown): Record<string, string> => {
  return Object.fromEntries(getFieldErrors(error).map((item) => [item.field, item.message]));
};

export const isValidationError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "VALIDATION_ERROR"
  );
};

export const isConflictError = (error: unknown): boolean => {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );
};

export const isNotFoundError = (error: unknown): boolean => {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "NOT_FOUND"
  );
};
