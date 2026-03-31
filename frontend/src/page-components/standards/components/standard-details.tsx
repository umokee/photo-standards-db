import ImageWithFallback from "@/components/ui/image-with-fallback/image-with-fallback";
import QueryState from "@/components/ui/query-state/query-state";
import { ManageSegmentGroups } from "@/page-components/segments/components/manage-segment-groups";
import { Standard } from "@/types/api";
import { BASE_URL } from "@/utils/constants";
import clsx from "clsx";
import { Star, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDeleteImage } from "../api/delete-image";
import { deafultStandard, useGetStandardDetail } from "../api/get-standard";
import { useSetReference } from "../api/set-reference";

interface Props {
  standard: Standard;
}

export const StandardDetails = ({ standard }: Props) => {
  const { groupId = null } = useParams();
  const navigate = useNavigate();
  const {
    data: standardDetail = deafultStandard,
    isLoading,
    isError,
  } = useGetStandardDetail(standard.id);
  const deleteImage = useDeleteImage({ standardId: standard.id });
  const setReference = useSetReference({ standardId: standard.id });

  const annotated = standard.annotated_count ?? 0;
  const total = standard.image_count ?? 0;
  const segmentCount =
    standardDetail.segment_groups.reduce((s, sg) => s + sg.segment_count, 0) ?? 0;
  const classes = standardDetail.segment_groups;

  const handleToEditor = (imageId: string) => {
    return navigate(`/groups/${groupId}/standards/${standard.id}/images/${imageId}`);
  };

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="standard-item__body">
      <div className="standard-item__body-toprow">
        <div className="standard-item__body-stats">
          <div className="standard-item__body-stat">
            Размечено:{" "}
            <span>
              {annotated} / {total}
            </span>
          </div>
          <div className="standard-item__body-stat">
            Сегментов: <span>{segmentCount}</span>
          </div>
        </div>
        <ManageSegmentGroups standard={standardDetail} />
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={standardDetail.images.length === 0}
        emptyText="Нет фотографий"
      >
        <div className="standard-item__body-images">
          {standardDetail.images.map((image) => (
            <div
              key={image.id}
              className={clsx("image-card", annotated && "image-card--annotated")}
              onClick={() => handleToEditor(image.id)}
            >
              <div className="image-card__photo">
                <ImageWithFallback src={`${BASE_URL}/storage/${image.image_path}`} iconSize={20} />
              </div>
              {image.is_reference && <span className="image-card__ref">ЭТ</span>}
              <div className="image-card__overlay">
                <button onClick={stop(() => setReference.mutate(image.id))}>
                  <Star size={12} />
                </button>
                <button onClick={stop(() => deleteImage.mutate(image.id))}>
                  <Trash2 size={12} />
                </button>
              </div>
              <span
                className={clsx(
                  "image-card__dot",
                  annotated ? "image-card__dot--done" : "image-card__dot--todo"
                )}
              />
            </div>
          ))}
        </div>
      </QueryState>

      {classes.length > 0 && (
        <div className="standard-item__body-classes">
          <div className="standard-item__body-classes-title">Классы</div>
          <div className="standard-item__body-classes-list">
            {classes.map((cls) => (
              <div key={cls.id} className="standard-item__body-classes-chip">
                <span
                  className="standard-item__body-classes-chip-dot"
                  style={{ background: `hsl(${cls.hue}, 65%, 55%)` }}
                />
                {cls.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
