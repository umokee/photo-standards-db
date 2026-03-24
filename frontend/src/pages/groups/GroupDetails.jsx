import { CheckCircle, Images, LayoutGrid, Pencil, Plus, Send, Trash2 } from "lucide-react";
import Button from "../../components/Button";
import StandardItem from "./StandardItem";
import { formatDate } from "../../utils/format";

export default function GroupDetails({ group, onEdit, onDelete, onAddStandard, onUploadImage, onEditStandard }) {
  const totalImages = group?.standards?.reduce((c, s) => c + (s.image_count ?? 0), 0) ?? 0;
  const annotated = group?.standards?.reduce((c, s) => c + (s.annotated_count ?? 0), 0) ?? 0;
  const totalPolygons = group?.standards?.reduce(
    (c, s) => c + (s.segment_groups?.reduce((c2, sg) => c2 + (sg.segment_count ?? 0), 0) ?? 0), 0
  ) ?? 0;

  return (
    <>
      <div className="content-header">
        <div className="content-header__top">
          <div>
            <div className="content-header__title">{group?.name}</div>
            {group?.description && <div className="content-header__sub">{group?.description}</div>}
            {group?.created_at && <div className="content-header__sub">{formatDate(group.created_at)}</div>}
          </div>
          <div className="content-header__actions">
            <Button variant="ghost" size="sm" icon={Plus} onClick={onAddStandard}>
              Новый эталон
            </Button>
            <Button variant="ghost" size="icon" icon={Pencil} onClick={onEdit} />
            <Button variant="danger" size="icon" icon={Trash2} onClick={onDelete} />
          </div>
        </div>
        <div className="content-header__meta">
          <div className="content-header__stat">
            <LayoutGrid size={12} strokeWidth={1.5} />
            <span className="content-header__stat-val">{group?.standards.length}</span> эталонов
          </div>
          <div className="content-header__stat">
            <Images size={12} strokeWidth={1.5} />
            <span className="content-header__stat-val">{totalImages}</span> изображений
          </div>
          <div className="content-header__stat">
            <CheckCircle size={12} strokeWidth={1.5} />
            <span className="content-header__stat-val content-header__stat-val--primary">{annotated}</span> размечено
          </div>
          <div className="content-header__stat">
            <Send size={12} strokeWidth={1.5} />
            <span className="content-header__stat-val content-header__stat-val--ml">{totalPolygons}</span> аннотаций (полигонов)
          </div>
        </div>
      </div>

      <div className="split__body">
        <div className="section-label">
          Эталоны
          <span className="badge badge--ghost">{group?.standards.length}</span>
        </div>
        {group?.standards.map((standard) => (
          <StandardItem
            key={standard.id}
            standard={standard}
            onUpload={() => onUploadImage(standard)}
            onEdit={() => onEditStandard(standard)}
          />
        ))}
      </div>
    </>
  );
}
