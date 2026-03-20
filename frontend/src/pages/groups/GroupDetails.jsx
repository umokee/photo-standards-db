import Button from "../../components/Button";
import { formatDate } from "../../utils/format";
import StandardItem from "./StandardItem";

export default function GroupDetails({ group, onEdit, onDelete, onAddStandard, onUploadImage }) {
  return (
    <>
      <div className="group-details">
        <div className="group-details__title">
          <span className="group-details__title-name">{group?.name}</span>
          <span className="group-details__title-description">{group?.description}</span>
          <div className="group-details__title-info">
            <span>{formatDate(group?.created_at)}</span>
            <span>{group?.standards.length} эталонов</span>
            <span>{group?.standards.reduce((count, s) => count + s.image_count, 0)} фото</span>
          </div>
        </div>
        <div className="group-details__actions">
          <Button variant={"danger"} onClick={onDelete}>
            Удалить
          </Button>
          <Button variant={"secondary"} onClick={onEdit}>
            Изменить
          </Button>
        </div>
      </div>
      <div className="group-standards-card">
        <div className="group-standards-card__header">
          <span>ЭТАЛОНЫ &middot; {group?.standards.length}</span>
          <Button variant={"secondary"} onClick={onAddStandard}>
            Добавить эталон
          </Button>
        </div>
        <div className="group-standards-card__body">
          {group?.standards.map((standard) => (
            <StandardItem
              key={standard.id}
              standard={standard}
              onUpload={() => onUploadImage(standard)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
