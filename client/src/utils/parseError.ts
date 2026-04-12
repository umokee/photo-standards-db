import { ApiError } from "@/lib/api-client";

const friendlyStatus: Record<number, string> = {
  400: "Некорректный запрос",
  403: "Доступ запрещён",
  404: "Не найдено",
  409: "Конфликт данных",
  500: "Внутренняя ошибка сервера",
};

export function parseError(error: unknown): { title: string; description: string } {
  if (error instanceof ApiError) {
    return {
      title: friendlyStatus[error.status] ?? `Ошибка ${error.status}`,
      description: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      title: "Что-то пошло не так",
      description: error.message,
    };
  }

  return {
    title: "Что-то пошло не так",
    description: "Произошла непредвиденная ошибка",
  };
}
