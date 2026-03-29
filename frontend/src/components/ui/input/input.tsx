import clsx from "clsx";
import s from "./input.module.scss";

interface Props {
  label?: string;
  placeholder?: string;
  value: string;
  error?: string;
  type?: "text" | "password" | "number";
  onChange: (value: string) => void;
}

export default function Input({
  label,
  placeholder,
  value,
  error,
  type = "text",
  onChange,
}: Props) {
  return (
    <div className={clsx(s.root, error && s.fieldError)}>
      {label && <label className={s.label}>{label}</label>}
      <input
        className={s.field}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className={s.errorMsg}>{error}</span>}
    </div>
  );
}
