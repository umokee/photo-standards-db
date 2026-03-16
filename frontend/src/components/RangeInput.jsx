export default function RangeInput({ label, suffix, format, min, max, step, value, onChange }) {
  return (
    <div className="range-input">
      <div className="range-input__info">
        <label className="range-input__label">{label}</label>
        <span className="range-input__value">
          {format ? format(value) : value}
          {suffix}
        </span>
      </div>
      <input
        className="range-input__field"
        style={{ "--val": ((value - min) / (max - min)) * 100 }}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
