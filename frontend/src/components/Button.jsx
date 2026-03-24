export default function Button({
  children,
  icon: Icon,
  size = "md",
  variant = "primary",
  full,
  disabled,
  onClick,
}) {
  return (
    <button
      className={`button button--${size} button--${variant}` + (full ? " button--full" : "")}
      disabled={disabled}
      onClick={onClick}
    >
      {Icon && <Icon />}
      {children && <span>{children}</span>}
    </button>
  );
}
