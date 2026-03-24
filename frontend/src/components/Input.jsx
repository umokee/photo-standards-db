export default function Input({
  label,
  placeholder,
  value,
  error,
  isPassword,
  isNumber,
  onChange,
}) {
  return (
    <div className={`input${error ? " input--error" : ""}`}>
      {label && <label className="input__label">{label}</label>}
      <input
        className="input__field"
        type={isPassword ? "password" : isNumber ? "number" : "text"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="input__error">{error}</span>}
    </div>
  );
}
