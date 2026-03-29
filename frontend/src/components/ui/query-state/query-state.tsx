import clsx from "clsx";
import { AlertCircle, Inbox } from "lucide-react";
import s from "./query-state.module.scss";

interface Props {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  loader?: "spinner" | "skeleton";
  skelRows?: number;
  emptyText?: string;
  children: React.ReactNode;
}

const loadingState = (loader: string, skelRows: number) => {
  return loader === "spinner" ? (
    <div className={s.state}>
      <div className={s.spinner} />
    </div>
  ) : (
    <>
      {Array.from({ length: skelRows }).map((_, i) => (
        <div key={i} className={s.skelItem}>
          <div className={clsx(s.skelDot, s.skelShimmer)} />
          <div className={clsx(s.skelLine, s.skelShimmer)} />
          <div className={clsx(s.skelEnd, s.skelShimmer)} />
        </div>
      ))}
    </>
  );
};

const errorState = () => {
  return (
    <div className={s.state}>
      <div className={clsx(s.icon, s.iconError)}>
        <AlertCircle />
      </div>
      <span className={clsx(s.title, s.titleError)}>Ошибка загрузки</span>
      <span className={clsx(s.sub)}>Попробуйте обновить страницу</span>
    </div>
  );
};

const emptyState = (emptyText: string) => {
  return (
    <div className={s.state}>
      <div className={s.icon}>
        <Inbox />
      </div>
      <span className={s.title}>{emptyText}</span>
    </div>
  );
};

export default function QueryState({
  isLoading,
  isError,
  isEmpty,
  loader = "spinner",
  skelRows = 5,
  emptyText = "Нет данных",
  children,
}: Props) {
  if (isLoading) return loadingState(loader, skelRows);
  if (isError) return errorState();
  if (isEmpty) return emptyState(emptyText);
  return children;
}
