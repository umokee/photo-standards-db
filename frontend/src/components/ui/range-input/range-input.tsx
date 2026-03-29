import s from "./range-input.module.scss";

interface Props {
  label?: string;
  suffix?: string;
  format?: (value: number) => string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}

export default function RangeInput({
  label,
  suffix,
  format,
  min,
  max,
  step,
  value,
  onChange,
}: Props) {
  return (
    <div className={s.root}>
      {(label || suffix) && (
        <div className={s.info}>
          <label className={s.label}>{label}</label>
          <span className={s.value}>
            {format ? format(value) : value}
            {suffix}
          </span>
        </div>
      )}
      <input
        className={s.field}
        style={{ "--val": ((value - min) / (max - min)) * 100 } as React.CSSProperties}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
