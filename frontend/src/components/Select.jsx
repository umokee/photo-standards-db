import "../styles/Select.css";

export default function Select({ label, options, value, onChange }) {
  return (
    <div className="select-group">
      {label && <label className="select-label">{label}</label>}
      <select className="select-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
