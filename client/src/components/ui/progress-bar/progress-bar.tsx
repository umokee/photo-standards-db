import { TriangleAlert } from "lucide-react";
import s from "./progress-bar.module.scss";

interface Props {
  value: number;
  max: number;
  warn?: boolean;
}

export default function ProgressBar({ value, max, warn }: Props) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={s.root}>
      <div className={s.track}>
        <div className={s.fill} style={{ width: `${pct}%` }} />
      </div>
      <span className={s.label}>
        {value}/{max}
      </span>
      {warn && <TriangleAlert size={14} className={s.warn} />}
    </div>
  );
}
