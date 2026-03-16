export default function QueryState({
  isLoading,
  isError,
  isEmpty,
  emptyText = "Нет данных",
  children,
}) {
  if (isLoading) return <div className="query-state query-state--loading">Загрузка...</div>;
  if (isError) return <div className="query-state query-state--error">Ошибка загрузки</div>;
  if (isEmpty) return <div className="query-state query-state--empty">{emptyText}</div>;
  return children;
}
