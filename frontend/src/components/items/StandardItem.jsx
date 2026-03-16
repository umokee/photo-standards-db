import { ChevronRight, EllipsisVertical } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageWithFallback from "../ImageWithFallback";
import { BASE_URL } from "../../utils/constants";

export default function StandardItem({ standard, onClick, onDelete, onEdit, onDeactivate }) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      className={!standard.is_active ? `standard-item standard-item--deactivated` : `standard-item`}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="standard-item__image">
        <ImageWithFallback
          className="standard-item__image"
          src={`${BASE_URL}/storage/${standard.image_path}`}
        />
        {!standard.is_active && <span className="standard-item__status">НЕАКТИВЕН</span>}
        {standard.angle && <span className="standard-item__badge">{standard.angle}</span>}
        <div className="standard-item__actions">
          <button
            className="standard-item__actions-btn"
            onClick={(e) => {
              (e.stopPropagation(), setShowMenu(!showMenu));
            }}
          >
            <EllipsisVertical size={16} />
          </button>
          {showMenu && (
            <div className="standard-item__actions-menu">
              <button className="standard-item__actions-menu-item" onClick={onEdit}>
                Изменить
              </button>
              <button
                className="standard-item__actions-menu-item"
                onClick={() => {
                  setShowMenu(false);
                  onDeactivate();
                }}
              >
                {standard.is_active ? "Деактивировать" : "Активировать"}
              </button>
              <button className="standard-item__actions-menu-item" onClick={onDelete}>
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="standard-item__body" onClick={() => navigate(`/standards/${standard.id}`)}>
        <div className="standard-item__body-info">
          <span>{standard.name}</span>
          <span>{standard.segment_count} сегм.</span>
        </div>
        <ChevronRight className="standard-item__body-label" />
      </div>
    </div>
  );
}
