import { paths } from "@/app/paths";
import ImageWithFallback from "@/components/ui/image-with-fallback/image-with-fallback";
import QueryState from "@/components/ui/query-state/query-state";
import { ManageSegmentGroups } from "@/page-components/segments/components/manage-segment-groups";
import { BASE_URL } from "@/utils/constants";
import clsx from "clsx";
import { Star, Trash2 } from "lucide-react";
import { MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDeleteImage } from "../../api/delete-image";
import { defaultStandard, useGetStandardDetail } from "../../api/get-standard";
import { useSetReference } from "../../api/set-reference";
import s from "./standard-card.module.scss";

const withoutBubbling = (fn: () => void) => (event: MouseEvent) => {
  event.stopPropagation();
  fn();
};

const ImageCard = ({
  image,
  onOpen,
  onSetReference,
  onDelete,
}: {
  image: { id: string; image_path: string; is_reference: boolean; annotation_count: number };
  onOpen: () => void;
  onSetReference: () => void;
  onDelete: () => void;
}) => {
  const isAnnotated = image.annotation_count > 0;

  return (
    <div
      className={clsx(s.imageCard, isAnnotated && s.imageCardAnnotated)}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className={s.imageCardPhoto}>
        <ImageWithFallback src={`${BASE_URL}/storage/${image.image_path}`} iconSize={20} />
      </div>

      {image.is_reference && <span className={s.imageCardRef}>ЭТ</span>}

      <div className={s.imageCardOverlay}>
        <button type="button" onClick={withoutBubbling(onSetReference)}>
          <Star size={12} />
        </button>
        <button type="button" onClick={withoutBubbling(onDelete)}>
          <Trash2 size={12} />
        </button>
      </div>

      <span
        className={clsx(s.imageCardDot, isAnnotated ? s.imageCardDotDone : s.imageCardDotTodo)}
      />
    </div>
  );
};

export const StandardCardDetails = ({ standardId }: { standardId: string }) => {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { data: standard = defaultStandard, isLoading, isError } = useGetStandardDetail(standardId);

  const deleteImage = useDeleteImage({ standardId });
  const setReference = useSetReference({ standardId });

  const annotated = standard.images.filter((image) => image.annotation_count > 0).length;
  const total = standard.images.length;
  const segmentCount = standard.segment_groups.reduce((sum, group) => sum + group.segment_count, 0);
  const classes = standard.segment_groups;

  const handleToEditor = (imageId: string) => {
    navigate(paths.standardImage(groupId, standardId, imageId));
  };

  return (
    <div className={s.body}>
      <div className={s.bodyToprow}>
        <div className={s.bodyStats}>
          <div className={s.bodyStat}>
            Размечено:{" "}
            <span>
              {annotated} / {total}
            </span>
          </div>
          <div className={s.bodyStat}>
            Сегментов: <span>{segmentCount}</span>
          </div>
        </div>
        <ManageSegmentGroups standard={standard} />
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!standard.images.length}
        emptyText="Нет фотографий"
      >
        <div className={s.bodyImages}>
          {standard.images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onOpen={() => handleToEditor(image.id)}
              onSetReference={() => setReference.mutate(image.id)}
              onDelete={() => deleteImage.mutate(image.id)}
            />
          ))}
        </div>
      </QueryState>

      {classes.length > 0 && (
        <div className={s.classes}>
          <div className={s.classTitle}>Классы</div>
          <div className={s.classList}>
            {classes.map((segmentGroup) => (
              <div key={segmentGroup.id} className={s.classChip}>
                <span
                  className={s.classChipDot}
                  style={{ background: `hsl(${segmentGroup.hue}, 65%, 55%)` }}
                />
                {segmentGroup.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
