import ImageWithFallback from "@/components/ui/image-with-fallback/image-with-fallback";
import QueryState from "@/components/ui/query-state/query-state";
import { ManageSegmentGroups } from "@/page-components/segments/components/manage-segment-groups/manage-segment-groups";
import { GroupStandard, StandardDetail } from "@/types/contracts";
import { BASE_URL } from "@/utils/constants";
import clsx from "clsx";
import { ChevronRight, Star, Trash2 } from "lucide-react";
import { MouseEvent } from "react";
import { useDeleteImage } from "../../api/delete-image";
import { useSetReference } from "../../api/set-reference";
import { DeleteStandard } from "../delete-standard";
import { UpdateStandard } from "../update-standard";
import { UploadImages } from "../upload-images";
import s from "./standard-card.module.scss";

type Props = {
  standard: GroupStandard;
  expanded: boolean;
  details: StandardDetail | null;
  detailsLoading: boolean;
  detailsError: boolean;
  onToggle: () => void;
  onToImageEditor: (imageId: string) => void;
};

export const StandardCard = ({
  standard,
  expanded,
  details,
  detailsLoading,
  detailsError,
  onToggle,
  onToImageEditor,
}: Props) => {
  const referenceImage = useSetReference({ standardId: standard.id });
  const deleteImage = useDeleteImage({ standardId: standard.id });

  const annotated = details?.images.filter((image) => image.annotation_count > 0).length ?? 0;

  const src = standard.reference_path
    ? `${BASE_URL}/storage/${standard.reference_path}`
    : undefined;

  const handleReferenceImage = ({ e, imageId }: { e: MouseEvent; imageId: string }) => {
    e.stopPropagation();
    referenceImage.mutate(imageId);
  };

  const handleDeleteImage = ({ e, imageId }: { e: MouseEvent; imageId: string }) => {
    e.stopPropagation();
    deleteImage.mutate(imageId);
  };

  return (
    <div className={clsx(s.root, expanded && s.expanded)}>
      <div className={s.header} onClick={onToggle} aria-expanded={expanded}>
        <div className={s.reference}>
          <ImageWithFallback src={src} iconSize={20} />
        </div>
        <div className={s.info}>
          <div className={s.name}>
            {standard.name} {standard.angle}
          </div>
          <div className={s.meta}>
            {standard.images_count} изображений &dirdot; {standard.annotated_images_count} размечено
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
          <QueryState
            isLoading={detailsLoading}
            isError={detailsError}
            isEmpty={!details}
            loadingText="Загрузка эталона"
            errorTitle="Ошибка загрузки эталона"
            errorDescription="Попробуйте позже"
            emptyTitle="Эталон не найден"
            emptyDescription="Данные эталона недоступны"
          >
            {details && (
              <>
                <div className={s.bodyToprow}>
                  <div className={s.bodyStats}>
                    <div className={s.bodyStat}>
                      Размечено: {annotated} / {details.stats.images_count}
                    </div>
                    <div className={s.bodyStat}>Сегментов: {details.stats.segments_count}</div>
                  </div>
                  <ManageSegmentGroups standard={details} />
                </div>

                <QueryState isEmpty={!details.images.length} emptyTitle="Нет фотографий">
                  <div className={s.bodyImages}>
                    {details.images.map((image) => {
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

                {details.segment_groups.length > 0 && (
                  <div className={s.classes}>
                    <div className={s.classTitle}>Классы</div>
                    <div className={s.classList}>
                      {details.segment_groups.map((segmentGroup) => (
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
              </>
            )}
          </QueryState>
        </div>
      )}
    </div>
  );
};
