import { X } from "lucide-react";

export default function Modal({ title, children, footer, wide, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal${wide ? " modal--wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">{title}</span>
          <button className="modal__close" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
