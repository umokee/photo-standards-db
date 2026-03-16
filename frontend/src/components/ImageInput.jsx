import { Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export default function ImageInput({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewUrl = useMemo(() => {
    return value ? URL.createObjectURL(value) : null;
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

  return (
    <div className="image-input">
      {label && <label className="image-input__label">{label}</label>}
      <input
        ref={inputRef}
        type={"file"}
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
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
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`image-input__zone${isDragging ? " image-input__zone--dragging" : error ? " image-input__zone--error" : ""}`}
      >
        {error ? (
          <span>{error}</span>
        ) : value ? (
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
            <span className="image-input__zone-title">Перетащите или выберите изображение</span>
            <span className="image-input__zone-subtitle">JPG, PNG &middot; максимум 20 Мб</span>
          </>
        )}
      </div>
    </div>
  );
}
