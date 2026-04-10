import Button from "@/components/ui/button/button";
import { Segment, SegmentGroup, SegmentWithPoints, StandardDetail } from "@/types/contracts";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { ManageSegmentGroups } from "../manage-segment-groups/manage-segment-groups";
import s from "./segment-panel.module.scss";

interface Props {
  standard?: StandardDetail;
  segments: Segment[];
  segmentGroups: SegmentGroup[];
  imageSegments: SegmentWithPoints[];
  selectedSegmentId: string | null;
  isRefining: boolean;
  selectedContourIndex: number | null;
  onSelectSegment: (id: string) => void;
  onStartDraw: () => void;
  onRefine: () => void;
  onSelectContour: (index: number | null) => void;
  onDeleteContour: (contourIndex: number) => void;
}

export const SegmentPanel = ({
  standard,
  segments,
  segmentGroups,
  imageSegments,
  selectedSegmentId,
  isRefining,
  selectedContourIndex,
  onSelectSegment,
  onStartDraw,
  onRefine,
  onSelectContour,
  onDeleteContour,
}: Props) => {
  const selectedSeg = segments.find((s) => s.id === selectedSegmentId);
  const selectedImgSeg = imageSegments.find((s) => s.id === selectedSegmentId);

  const groupedSegments = segmentGroups.map((group) => ({
    group,
    segments: segments.filter((s) => s.segment_group_id === group.id),
  }));

  return (
    <div className={s.root}>
      <div className={clsx(s.section, s.classes)}>
        <div className={s.sectionHeader}>
          <span className={s.sectionTitle}>Классы</span>
          {standard && <ManageSegmentGroups standard={standard} compact />}
        </div>
        <div className={s.classes}>
          {groupedSegments.map(({ group, segments: groupSegs }) => (
            <div key={group.id} className={s.groupBlock}>
              <div className={s.groupLabel}>
                <span
                  className={s.groupColor}
                  style={{ background: `hsl(${group.hue}, 70%, 50%)` }}
                />
                {group.name}
              </div>
              {groupSegs.map((seg) => {
                const segImgSeg = imageSegments.find((s) => s.id === seg.id);
                const hasPoints = !!segImgSeg?.points.length;

                return (
                  <div
                    key={seg.id}
                    className={clsx(s.classItem, selectedSegmentId === seg.id && s.selected)}
                    onClick={() => onSelectSegment(seg.id)}
                  >
                    <span
                      className={s.classColor}
                      style={{
                        background: `hsl(${group.hue}, 70%, 50%)`,
                      }}
                    />
                    <span className={s.classLabel}>{seg.name}</span>
                    <span className={clsx(s.classCount, hasPoints && s.has)}>
                      {hasPoints ? `${segImgSeg?.points.length} пол.` : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={clsx(s.section, s.anns)}>
        {selectedSeg && (
          <div className={s.sectionHeader}>
            <span className={s.sectionTitle}>Полигоны</span>
            <span className={s.sectionMeta}>{selectedSeg.name}</span>
          </div>
        )}
        <div className={s.anns}>
          {!selectedSeg ? (
            <div className={s.annEmpty}>Выберите класс</div>
          ) : !selectedImgSeg.points.length ? (
            <div className={s.annEmpty}>Класс не размечен</div>
          ) : (
            <>
              {selectedImgSeg.points.map((_, i) => (
                <div
                  key={i}
                  className={clsx(s.annItem, selectedContourIndex === i && s.selected)}
                  onClick={() => onSelectContour(i)}
                >
                  <div className={s.annPolygon}>Полигон {i + 1}</div>
                  <div
                    className={s.annDelete}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteContour(i);
                    }}
                  >
                    <Trash2 size={11} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className={s.actions}>
        <Button
          variant="ml"
          size="sm"
          disabled={isRefining || !selectedImgSeg?.points?.length}
          onClick={onRefine}
        >
          Уточнить
        </Button>
        <Button variant="ghost" size="sm" disabled={!selectedSegmentId} onClick={onStartDraw}>
          Добавить разметку
        </Button>
      </div>
    </div>
  );
};
