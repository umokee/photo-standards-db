import clsx from "clsx";
import s from "./badge.module.scss";

interface Props {
  type?: "info" | "success" | "warning" | "danger";
  colorDot?: number;
  children: React.ReactNode;
}

export const Badge = ({ type = "info", colorDot, children }: Props) => {
  return (
    <div className={clsx(s.root, s[type])}>
      {colorDot && (
        <span className={s.colorDot} style={{ background: `hsl(${colorDot}, 65%, 55%)` }} />
      )}
      {children}
    </div>
  );
};
