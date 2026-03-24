export default function Select({ label, options, value, placeholder, error, disabled, onChange }) {
  return (
    <div className={`select${error ? " select--error" : ""}`}>
      {label && <label className="select__label">{label}</label>}
      <select
        className="select__field"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="select__error">{error}</span>}
    </div>
  );
}
