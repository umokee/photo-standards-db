export default function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" />
      {label && <span className="toggle__label">{label}</span>}
    </label>
  );
}
