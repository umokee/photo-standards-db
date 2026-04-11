import QueryState from "@/components/ui/query-state/query-state";

export default function ImagesErrorBoundary() {
  return (
    <QueryState
      isError
      size="page"
      errorTitle="Не удалось открыть изображение"
      errorDescription="Проверьте ссылку или попробуйте обновить страницу"
    >
      {null}
    </QueryState>
  );
}
