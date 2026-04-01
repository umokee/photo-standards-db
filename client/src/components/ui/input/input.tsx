import clsx from "clsx";
import s from "./input.module.scss";

interface Props {
  label?: string;
  placeholder?: string;
  value: string;
  error?: string;
  noMargin?: boolean;
  type?: "text" | "password" | "number";
  onChange: (value: string) => void;
}

export default function Input({
  label,
  placeholder,
  value,
  error,
  type = "text",
  noMargin,
  onChange,
}: Props) {
  return (
    <div className={clsx(s.root, noMargin && s.noMargin)}>
      {label && <label className={s.label}>{label}</label>}
      <input
        className={clsx(s.field, error && s.fieldError)}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className={s.errorMsg}>{error}</span>}
    </div>
  );
}
