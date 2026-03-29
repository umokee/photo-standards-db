import s from "./content-header.module.scss";

interface Props {
  title: string;
  sub?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function ContentHeader({ title, sub, meta, actions }: Props) {
  return (
    <div className={s.root}>
      <div className={s.top}>
        <div>
          <div className={s.title}>{title}</div>
          {sub && <div className={s.sub}>{sub}</div>}
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </div>
      {meta && <div className={s.meta}>{meta}</div>}
    </div>
  );
}
