import { AlertTriangle } from "lucide-react";

export default function SegmentItem({ segment, isSelected, onClick }) {
  return (
    <div className={`segment-item${isSelected ? " segment-item--active" : ""}`} onClick={onClick}>
      <div className="segment-item__header">
        <span className="segment-item__header-label">{segment.label}</span>
        {segment.is_critical && <AlertTriangle className="segment-item__header-icon" size={24} />}
      </div>
      <div className="segment-item__footer">{`Порог: ${segment.confidence_threshold * 100}%`}</div>
    </div>
  );
}
