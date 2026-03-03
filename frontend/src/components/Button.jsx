import "../styles/Button.css";

export default function Button({
  children,
  icon: Icon,
  size = "simple",
  variant = "primary",
  full,
  onClick,
}) {
  return (
    <button className={`btn btn-${size} btn-${variant} ${full ? "btn-full" : ""}`} onClick={onClick}>
      {Icon && <Icon className="btn-icon" />}
      {children}
    </button>
  );
}
