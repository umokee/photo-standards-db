import "../styles/Input.css";

export default function Input({ label, placeholder, value, isPassword, onChange }) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <input
        className="input-field"
        type={isPassword ? "password" : "text"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
