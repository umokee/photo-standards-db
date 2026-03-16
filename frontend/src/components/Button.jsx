export default function Button({
  children,
  icon: Icon,
  size = "simple",
  variant = "primary",
  full,
  disabled,
  onClick,
}) {
  return (
    <button
      className={
        `btn btn-${size} btn-${variant}` +
        (full ? " btn-full" : "")
      }
      disabled={disabled}
      onClick={onClick}
    >
      {Icon && <Icon className="btn__icon" />}
      {children}
    </button>
  );
}
