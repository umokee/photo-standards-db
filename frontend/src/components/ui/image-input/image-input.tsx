import clsx from "clsx";
import { Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import s from "./image-input.module.scss";

const PREVIEW_LIMIT = 4;

interface Props {
  label?: string;
  value: File[] | null;
  onChange: (value: File[] | null) => void;
}

export default function ImageInput({ label, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previews = useMemo(
    () => value?.slice(0, PREVIEW_LIMIT).map((f) => URL.createObjectURL(f)) ?? [],
    [value]
  );

  function handleFiles(files: File[]) {
    for (const file of files) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setError(`${file.name} - только JPG и PNG файлы`);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`${file.name} - слишком большой файл`);
        return;
      }
    }
    setError(null);
    onChange(files);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={s.root}>
      {label && <label className={s.label}>{label}</label>}
      <input
        ref={inputRef}
        type={"file"}
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles([...e.target.files!]);
        }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles([...e.dataTransfer.files]);
        }}
        className={clsx(s.zone, {
          [s.zoneDragging]: isDragging,
          [s.zoneError]: !isDragging && !!error,
        })}
      >
        {error ? (
          <span>{error}</span>
        ) : value && value.length > 0 ? (
          <div className={s.files}>
            {value.length <= PREVIEW_LIMIT ? (
              <div className={s.filesGrid}>
                {previews.map((src, i) => (
                  <img key={i} src={src} className={s.filesGridImg} />
                ))}
              </div>
            ) : (
              <span className={s.filesCount}>Выбрано: {value.length} фото</span>
            )}
            <button type="button" className={s.previewClear} onClick={clear}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload className={s.icon} size={28} />
            <span className={s.title}>Перетащите или выберите изображения</span>
            <span className={s.subtitle}>JPG, PNG · максимум 20 Мб</span>
          </>
        )}
      </div>
    </div>
  );
}
