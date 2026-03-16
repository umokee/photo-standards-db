export default function Input({ label, placeholder, value, isPassword, onChange }) {
  return (
    <div className="input">
      {label && <label className="input__label">{label}</label>}
      <input
        className="input__field"
        type={isPassword ? "password" : "text"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
