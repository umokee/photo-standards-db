import Button from "@/components/ui/button/button";
import { Segment, SegmentGroup, SegmentWithPoints, StandardDetail } from "@/types/contracts";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { ManageSegmentGroups } from "../manage-segment-groups";
import s from "./segment-panel.module.scss"

interface Props {
  standard?: StandardDetail;
  segments: Segment[];
  segmentGroups: SegmentGroup[];
  imageSegments: SegmentWithPoints[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string) => void;
  onStartDraw: () => void;
  onRefine: () => void;
  isRefining: boolean;
  selectedContourIndex: number | null;
  onSelectContour: (index: number | null) => void;
  onDeleteContour: (contourIndex: number) => void;
}

export const SegmentPanel = ({
  standard,
  segments,
  segmentGroups,
  imageSegments,
  selectedSegmentId,
  onSelectSegment,
  onStartDraw,
  onRefine,
  isRefining,
  selectedContourIndex,
  onSelectContour,
  onDeleteContour,
}: Props) => {
  const selectedSeg = segments.find((s) => s.id === selectedSegmentId);
  const selectedImgSeg = imageSegments.find((s) => s.id === selectedSegmentId);
  const selectedGroup = segmentGroups.find((g) => g.id === selectedSeg?.segment_group_id);
  const selectedColor = selectedGroup ? `hsl(${selectedGroup.hue}, 70%, 50%)` : "#888";

  const groupedSegments = segmentGroups.map((group) => ({
    group,
    segments: segments.filter((s) => s.segment_group_id === group.id),
  }));

  return (
    <div className="seg-sidebar">
      <div className="seg-sb-section seg-sb-section--classes">
        <div className="seg-sb-head">
          <span className="seg-sb-head__title">Классы</span>
          {standard && <ManageSegmentGroups standard={standard} compact />}
        </div>
        <div className="seg-class-scroll">
          {groupedSegments.map(({ group, segments: groupSegs }) => (
            <div key={group.id} className="seg-group-block">
              <div className="seg-group-label">
                <span
                  className="seg-group-label__swatch"
                  style={{ background: `hsl(${group.hue}, 70%, 50%)` }}
                />
                {group.name}
              </div>
              {groupSegs.map((seg) => {
                const segImgSeg = imageSegments.find((s) => s.id === seg.id);
                const hasPoints = !!segImgSeg?.points?.length;

                return (
                  <div
                    key={seg.id}
                    className={clsx(
                      "seg-class-item",
                      selectedSegmentId === seg.id ? "selected" : ""
                    )}
                    onClick={() => onSelectSegment(seg.id)}
                  >
                    <span
                      className="seg-class-item__swatch"
                      style={{
                        background: `hsl(${group.hue}, 70%, 50%)`,
                      }}
                    />
                    <span className="seg-class-item__label">{seg.name}</span>
                    <span
                      className={clsx(
                        "seg-class-item__cnt",
                        hasPoints ? "seg-class-item__cnt--has" : ""
                      )}
                    >
                      {hasPoints ? `${segImgSeg.points.length} пол.` : "-"}
                    </span>
                    <span
                      className={clsx(
                        "seg-class-item__status",
                        hasPoints ? "seg-class-item__status--done" : "seg-class-item__status--none"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="seg-sb-section seg-sb-section--anns">
        {selectedSeg && (
          <div className="seg-sb-head">
            <span className="seg-sb-head__title">«{selectedSeg.name}»</span>
          </div>
        )}
        <div className="seg-ann-scroll">
          {!selectedSeg ? (
            <div className="seg-ann-empty">Выберите класс для просмотра разметки</div>
          ) : !selectedImgSeg?.points?.length ? (
            <div className="seg-ann-empty seg-ann-empty--draw">
              Класс не размечен.
              <br />
              Нажмите «Добавить разметку».
            </div>
          ) : (
            <>
              {selectedImgSeg.points.map((contour, i) => (
                <div
                  key={i}
                  className={clsx("seg-ann-item", selectedContourIndex === i && "selected")}
                  onClick={() => onSelectContour(i)}
                >
                  <div className="seg-ann-item__idx" style={{ background: selectedColor }}>
                    {i + 1}
                  </div>
                  <div className="seg-ann-item__pts">{contour.length} точек</div>
                  <div
                    className="seg-ann-item__del"
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

      <div className="seg-sb-footer">
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
