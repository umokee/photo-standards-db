import Button from "@/components/ui/button/button";
import QueryState from "@/components/ui/query-state/query-state";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";

export default function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Что-то пошло не так";
  let description = "Во время открытия страницы произошла непредвиденная ошибка";

  if (isRouteErrorResponse(error)) {
    title = `Ошибка ${error.status}`;
    description =
      typeof error.data === "string"
        ? error.data
        : error.statusText || "Не удалось открыть страницу";
  } else if (error instanceof Error && error.message) {
    description = error.message;
  }

  return (
    <QueryState
      isError
      size="page"
      errorTitle={title}
      errorDescription={description}
      action={
        <Button variant="ghost" size="sm" onClick={() => navigate("/groups")}>
          Вернуться к группам
        </Button>
      }
    >
      {null}
    </QueryState>
  );
}
