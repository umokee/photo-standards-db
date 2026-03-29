import clsx from "clsx";
import s from "./select.module.scss";

interface Option {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  options: Option[];
  value: string | null;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function Select({
  label,
  options,
  value,
  placeholder,
  error,
  disabled,
  onChange,
}: Props) {
  return (
    <div className={clsx(s.root, error && s.fieldError)}>
      {label && <label className={s.label}>{label}</label>}
      <select
        className={s.field}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className={s.errorMsg}>{error}</span>}
    </div>
  );
}
