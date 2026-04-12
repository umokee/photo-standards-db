import { Badge } from "@/components/ui/badge/badge";
import ImageWithFallback from "@/components/ui/image-with-fallback/image-with-fallback";
import { QueryBoundary } from "@/components/ui/query-boundary/query-boundary";
import QueryState from "@/components/ui/query-state/query-state";
import { BASE_URL } from "@/lib/api-client";
import { ManageSegmentGroups } from "@/page-components/segments/components/manage-segment-groups/manage-segment-groups";
import { GroupStandard } from "@/types/contracts";
import clsx from "clsx";
import { ChevronRight, Star, Trash2 } from "lucide-react";
import { MouseEvent } from "react";
import { useDeleteImage } from "../../api/delete-image";
import { useGetStandardDetail } from "../../api/get-standard";
import { useSetReference } from "../../api/set-reference";
import { DeleteStandard } from "../delete-standard";
import { UpdateStandard } from "../update-standard";
import { UploadImages } from "../upload-images";
import s from "./standard-card.module.scss";

type Props = {
  standard: GroupStandard;
  expanded: boolean;
  onToggle: () => void;
  onToImageEditor: (imageId: string) => void;
};

export const StandardCard = ({ standard, expanded, onToggle, onToImageEditor }: Props) => {
  const src = standard.reference_path
    ? `${BASE_URL}/storage/${standard.reference_path}`
    : undefined;

  return (
    <div className={clsx(s.root, expanded && s.expanded)}>
      <div className={s.header} onClick={onToggle}>
        <div className={s.reference}>
          <ImageWithFallback src={src} iconSize={20} />
        </div>
        <div className={s.info}>
          <div className={s.name}>
            {standard.name} {standard.angle}
          </div>
          <div className={s.meta}>
            {standard.images_count} изображений &middot; {standard.annotated_images_count} размечено
          </div>
        </div>
        <div className={s.actions} onClick={(e) => e.stopPropagation()}>
          <UploadImages standardId={standard.id} />
          <UpdateStandard standard={standard} />
          <DeleteStandard id={standard.id} name={standard.name} />
        </div>
        <ChevronRight className={s.chevron} size={14} />
      </div>
      {expanded && (
        <div className={s.body}>
          <QueryBoundary
            loadingText="Загрузка подробностей..."
            errorTitle="Не удалось загрузить подробности"
          >
            <StandardCardDetail standardId={standard.id} onToImageEditor={onToImageEditor} />
          </QueryBoundary>
        </div>
      )}
    </div>
  );
};

const StandardCardDetail = ({
  standardId,
  onToImageEditor,
}: {
  standardId: string;
  onToImageEditor: (imageId: string) => void;
}) => {
  const { data: standard } = useGetStandardDetail(standardId);
  const referenceImage = useSetReference({ standardId: standard.id });
  const deleteImage = useDeleteImage({ standardId: standard.id });
  const annotated = standard.images.filter((image) => image.annotation_count > 0).length ?? 0;

  const handleReferenceImage = ({ e, imageId }: { e: MouseEvent; imageId: string }) => {
    e.stopPropagation();
    referenceImage.mutate(imageId);
  };

  const handleDeleteImage = ({ e, imageId }: { e: MouseEvent; imageId: string }) => {
    e.stopPropagation();
    deleteImage.mutate(imageId);
  };

  return (
    <>
      <div className={s.bodyToprow}>
        <div className={s.bodyStats}>
          <div className={s.bodyStat}>
            Размечено: {annotated} / {standard.stats.images_count}
          </div>
          <div className={s.bodyStat}>Сегментов: {standard.stats.segments_count}</div>
        </div>
        <ManageSegmentGroups standard={standard} />
      </div>

      <QueryState isEmpty={!standard.images.length} emptyTitle="Нет фотографий">
        <div className={s.bodyImages}>
          {standard.images.map((image) => {
            const isAnnotated = image.annotation_count > 0;

            return (
              <div
                key={image.id}
                className={clsx(s.imageCard, isAnnotated && s.imageCardAnnotated)}
                onClick={() => onToImageEditor(image.id)}
              >
                <div className={s.imageCardPhoto}>
                  <ImageWithFallback
                    src={`${BASE_URL}/storage/${image.image_path}`}
                    iconSize={20}
                  />
                </div>

                {image.is_reference && <span className={s.imageCardRef}>ЭТ</span>}

                <div className={s.imageCardOverlay}>
                  <button
                    type="button"
                    onClick={(e) => handleReferenceImage({ e, imageId: image.id })}
                  >
                    <Star size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteImage({ e, imageId: image.id })}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <span
                  className={clsx(
                    s.imageCardDot,
                    isAnnotated ? s.imageCardDotDone : s.imageCardDotTodo
                  )}
                />
              </div>
            );
          })}
        </div>
      </QueryState>

      {standard.segment_groups.length > 0 && (
        <div className={s.classes}>
          <span className={s.classTitle}>Классы</span>
          <div className={s.classList}>
            {standard.segment_groups.map((segmentGroup) => (
              <Badge key={segmentGroup.id} colorDot={segmentGroup.hue}>
                {segmentGroup.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
