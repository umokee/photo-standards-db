import { useState } from "react";
import Button from "../Button";
import Input from "../Input";
import RangeInput from "../RangeInput";
import Toggle from "../Toggle";

export default function SegmentFormModal({
  screenX,
  screenY,
  isPending,
  onDelete,
  onClose,
  onSubmit,
  submitText,
  initialLabel = "",
  initialIsCritical = true,
  initialConfidenceThreshold = 0.7,
}) {
  const [label, setLabel] = useState(initialLabel);
  const [isCritical, setIsCritical] = useState(initialIsCritical);
  const [confidenceThreshold, setConfidenceThreshold] = useState(initialConfidenceThreshold);

  return (
    <div
      className="segment-form-modal"
      style={screenX ? { position: "fixed", left: screenX, top: screenY } : undefined}
    >
      <Input placeholder="Название детали" value={label} onChange={setLabel} />
      <RangeInput
        label="Порог обнаружения"
        suffix="%"
        format={(v) => Math.round(v * 100)}
        min={0.3}
        max={0.95}
        step={0.05}
        value={confidenceThreshold}
        onChange={(val) => setConfidenceThreshold(parseFloat(val))}
      />
      <div className="segment-form-modal__divider">
        <span>Критичность:</span>
        <Toggle checked={isCritical} onChange={setIsCritical} />
      </div>
      <div className="segment-form-modal__btns">
        {onDelete && (
          <Button variant="danger" onClick={onDelete}>
            Удалить
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button
          variant="primary"
          disabled={isPending}
          onClick={() => onSubmit({ label, isCritical, confidenceThreshold })}
        >
          {submitText}
        </Button>
      </div>
    </div>
  );
}
