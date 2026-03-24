import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export default function QueryState({
  isLoading,
  isError,
  isEmpty,
  emptyText = "Нет данных",
  emptyIcon: EmptyIcon = Inbox,
  children,
}) {
  if (isLoading)
    return (
      <div className="query-state query-state--loading">
        <div className="query-state__icon">
          <Loader2 className="query-state__spinner" />
        </div>
        <span className="query-state__title">Загрузка...</span>
      </div>
    );

  if (isError)
    return (
      <div className="query-state query-state--error">
        <div className="query-state__icon">
          <AlertCircle />
        </div>
        <span className="query-state__title">Ошибка загрузки</span>
        <span className="query-state__sub">Попробуйте обновить страницу</span>
      </div>
    );

  if (isEmpty)
    return (
      <div className="query-state query-state--empty">
        <div className="query-state__icon">
          <EmptyIcon />
        </div>
        <span className="query-state__title">{emptyText}</span>
      </div>
    );

  return children;
}
