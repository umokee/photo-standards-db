import { ChevronRight, Hexagon, Pencil, Star, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import ImageWithFallback from "../../components/ImageWithFallback";
import SegmentGroupsModal from "../../components/modals/SegmentGroupsModal";
import QueryState from "../../components/QueryState";
import useStandardDetail from "../../hooks/useStandardDetail";
import useStandardImages from "../../hooks/useStandardImages";
import { BASE_URL } from "../../utils/constants";

export default function StandardItem({ standard, onUpload, onEdit }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpaned] = useState(false);
  const [showClasses, setShowClasses] = useState(false);
  const { standard: detail, status } = useStandardDetail(standard.id, { enabled: isExpanded });
  const { remove, setReference } = useStandardImages(undefined, standard.id);
  const pct =
    standard.image_count > 0
      ? Math.round((standard.annotated_count / standard.image_count) * 100)
      : 0;

  return (
    <>
      <div className={`standard-item${isExpanded ? " standard-item--expanded" : ""}`}>
        <div className="standard-item__header" onClick={() => setIsExpaned(!isExpanded)}>
          <div className="standard-item__thumb">
            <ImageWithFallback src={`${BASE_URL}/storage/${standard.image_path}`} iconSize={20} />
          </div>
          <div className="standard-item__header-info">
            <div className="standard-item__header-info-name">
              {standard.name} ({standard.angle})
            </div>
            <div className="standard-item__header-info-details">
              {standard.image_count} изображений &middot; {standard.segment_groups?.length ?? 0}{" "}
              YOLO-классов
            </div>
          </div>
          <div className="standard-item__right" onClick={(e) => e.stopPropagation()}>
            <div className="standard-item__right-actions">
              <Button variant="ghost" size="sm" icon={Upload} onClick={onUpload}>
                Фото
              </Button>
              <Button variant="ghost" size="icon" icon={Pencil} onClick={onEdit} />
            </div>
            <div className="standard-item__right-bar">
              <span className="standard-item__right-pct">{pct}%</span>
              <div className="standard-item__bar">
                <div className="standard-item__bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
          <ChevronRight className="standard-item__header-icon" size={14} />
        </div>

        {isExpanded && (
          <div className="standard-item__body">
            <div className="standard-item__body-toprow">
              <div className="standard-item__body-stats">
                <div className="standard-item__body-stat">
                  Размечено:{" "}
                  <span>
                    {detail?.annotated_count ?? standard.annotated_count} /{" "}
                    {detail?.image_count ?? standard.image_count}
                  </span>
                </div>
                <div className="standard-item__body-stat">
                  Сегментов:{" "}
                  <span>
                    {detail?.segment_groups?.reduce((s, sg) => s + sg.segment_count, 0) ?? 0}
                  </span>
                </div>
              </div>
              <Button variant="ml" size="sm" icon={Hexagon} onClick={() => setShowClasses(true)}>
                Классы сегментации
              </Button>
            </div>

            <QueryState
              isLoading={status.isLoading}
              isError={status.isError}
              isEmpty={detail?.images.length === 0}
              emptyText="Нет фотографий"
            >
              {detail && (
                <div className="standard-item__body-images">
                  {detail.images.map((image) => (
                    <div
                      key={image.id}
                      className={`standard-item__body-images-img${image.annotation_count > 0 ? " standard-item__body-images-img--annotated" : ""}`}
                      onClick={() => navigate(`/standards/${standard.id}/image/${image.id}`)}
                    >
                      <div className="standard-item__body-images-img-photo">
                        <ImageWithFallback
                          src={`${BASE_URL}/storage/${image.image_path}`}
                          iconSize={20}
                        />
                      </div>
                      {image.is_reference && (
                        <span className="standard-item__body-images-img-ref">ЭТ</span>
                      )}
                      <div className="standard-item__body-images-img-overlay">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReference.mutate(image.id);
                          }}
                        >
                          <Star size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            remove.mutate(image.id);
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <span
                        className={`standard-item__body-images-img-dot standard-item__body-images-img-dot--${image.annotation_count > 0 ? "done" : "todo"}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </QueryState>

            {detail?.segment_groups?.length > 0 && (
              <div className="standard-item__body-classes">
                <div className="standard-item__body-classes-title">YOLO-классы</div>
                <div className="standard-item__body-classes-list">
                  {detail.segment_groups.map((sg) => (
                    <div key={sg.id} className="standard-item__body-classes-chip">
                      <span
                        className="standard-item__body-classes-chip-dot"
                        style={{ background: `hsl(${sg.hue}, 65%, 55%)` }}
                      />
                      {sg.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showClasses && (
        <SegmentGroupsModal
          segmentGroups={detail?.segment_groups ?? []}
          segments={detail?.segments ?? []}
          standardId={standard.id}
          standardName={`${standard.name} (${standard.angle})`}
          onClose={() => setShowClasses(false)}
        />
      )}
    </>
  );
}
