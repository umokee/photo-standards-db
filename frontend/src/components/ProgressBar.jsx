import { TriangleAlert } from "lucide-react";

export default function ProgressBar({ value, max, warn }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="progress-bar">
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-bar__label">{value}/{max}</span>
      {warn && <TriangleAlert size={14} className="progress-bar__warn" />}
    </div>
  );
}
