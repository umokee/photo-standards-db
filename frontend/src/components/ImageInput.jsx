import { Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export default function ImageInput({ label, value, onChange, multiple }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewUrl = useMemo(() => {
    return value instanceof File ? URL.createObjectURL(value) : null;
  }, [value]);

  function handleFile(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Только JPG и PNG файлы");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Файл слишком большой. Максимум 20 Мб");
      return;
    }
    setError(null);
    onChange(file);
  }

  function handleFiles(files) {
    const valid = [];
    for (const file of files) {
      if (!file) return;
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setError(`${file.name} - только JPG и PNG файлы`);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`${file.name} - слишком большой файл`);
        return;
      }
      valid.push(file);
    }
    setError(null);
    onChange(valid);
  }

  return (
    <div className="image-input">
      {label && <label className="image-input__label">{label}</label>}
      <input
        ref={inputRef}
        type={"file"}
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(e) => {
          if (multiple) {
            handleFiles([...e.target.files]);
          } else {
            handleFile(e.target.files[0]);
          }
        }}
      />
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (multiple) {
            handleFiles([...e.dataTransfer.files]);
          } else {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        className={`image-input__zone${isDragging ? " image-input__zone--dragging" : error ? " image-input__zone--error" : ""}`}
      >
        {error ? (
          <span>{error}</span>
        ) : multiple && value?.length > 0 ? (
          <div className="image-input__zone-files">
            <span className="image-input__zone-files-count">Выбрано: {value.length} фото</span>
            <div className="image-input__zone-files-list">
              {value.slice(0, 5).map((f, i) => (
                <span key={i} className="image-input__zone-files-name">
                  {f.name}
                </span>
              ))}
              {value.length > 5 && (
                <span className="image-input__zone-files-more">и ещё {value.length - 5}...</span>
              )}
            </div>
            <button
              className="image-input__zone-preview-clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                inputRef.current.value = null;
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : !multiple && value ? (
          <div className="image-input__zone-preview">
            <img src={previewUrl} className="image-input__zone-preview-img" />
            <span className="image-input__zone-preview-name">{value.name}</span>
            <button
              className="image-input__zone-preview-clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                inputRef.current.value = null;
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload className="image-input__zone-icon" size={28} />
            <span className="image-input__zone-title">
              {multiple
                ? "Перетащите или выберите изображения"
                : "Перетащите или выберите изображение"}
            </span>
            <span className="image-input__zone-subtitle">JPG, PNG &middot; максимум 20 Мб</span>
          </>
        )}
      </div>
    </div>
  );
}
