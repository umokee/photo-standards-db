import Button from "../../components/Button";
import { formatDate } from "../../utils/format";

export default function CameraDetails({ camera, onEdit, onDelete }) {
  return (
    <>
      <div className="camera-preview"></div>
      <div className="camera-card">
        <div className="camera-card__body">
          <div>
            <span className="camera-card__body-name">Название: </span>
            <span>{camera?.name}</span>
          </div>
          <div>
            <span className="camera-card__body-name">URL: </span>
            <span>{camera?.url}</span>
          </div>
          <div>
            <span className="camera-card__body-name">Расположение: </span>
            <span>{camera?.location}</span>
          </div>
          {/* ???????? */}
          {/* <div>
                <span className="camera-card__body-name">Разрешение: </span>
                <span>{camera.resolution}</span>
              </div> */}
          <div>
            <span className="camera-card__body-name">Последняя связь: </span>
            <span>{camera?.last_seen_at ? formatDate(camera?.last_seen_at) : "-"}</span>
          </div>
          <div>
            <span className="camera-card__body-name">Статус: </span>
            <span>{camera?.is_active ? "Активна" : "Неактивна"}</span>
          </div>
        </div>
        <div className="camera-card__footer">
          <Button disabled>Проверить</Button>
          <Button variant={"secondary"} onClick={onEdit}>
            Изменить
          </Button>
          <Button variant={"danger"} onClick={onDelete}>
            Удалить
          </Button>
        </div>
      </div>
    </>
  );
}
