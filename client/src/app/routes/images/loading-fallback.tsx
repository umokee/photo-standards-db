import QueryState from "@/components/ui/query-state/query-state";

export default function ImagesLoadingFallback() {
  return (
    <QueryState isLoading size="page" loadingText="Загрузка изображения">
      {null}
    </QueryState>
  );
}
