export default function Select({ label, options, value, placeholder, disabled, onChange }) {
  return (
    <div className="select">
      {label && <label className="select__name">{label}</label>}
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
    </div>
  );
}
