import Button from "@/components/ui/button/button";
import {
  SegmentClass,
  SegmentClassCategory,
  SegmentClassWithPoints,
  StandardDetail,
} from "@/types/contracts";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { ManageSegmentGroups } from "../manage-segment-groups/manage-segment-groups";
import s from "./segment-panel.module.scss";

export type DrawKind = "polygon" | "scissors";

interface Props {
  standard?: StandardDetail;
  categories: SegmentClassCategory[];
  ungroupedClasses: SegmentClass[];
  imageSegmentClasses: SegmentClassWithPoints[];
  selectedSegmentClassId: string | null;
  isRefining: boolean;
  selectedContourIndex: number | null;
  onSelectSegmentClass: (id: string) => void;
  onStartDraw: (kind: DrawKind) => void;
  onRefine: () => void;
  onSelectContour: (index: number | null) => void;
  onDeleteContour: (contourIndex: number) => void;
}

export const SegmentPanel = ({
  standard,
  categories,
  ungroupedClasses,
  imageSegmentClasses,
  selectedSegmentClassId,
  selectedContourIndex,
  onSelectSegmentClass,
  onStartDraw,
  onSelectContour,
  onDeleteContour,
}: Props) => {
  const allClasses = [...categories.flatMap((c) => c.segment_classes), ...ungroupedClasses];

  const selectedSeg = allClasses.find((s) => s.id === selectedSegmentClassId);
  const selectedImgSeg = imageSegmentClasses.find((s) => s.id === selectedSegmentClassId);

  return (
    <div className={s.root}>
      <div className={clsx(s.section, s.classes)}>
        <div className={s.sectionHeader}>
          <span className={s.sectionTitle}>Классы</span>
          {standard && <ManageSegmentGroups standard={standard} compact />}
        </div>

        <div className={s.classes}>
          {categories.map((category) => (
            <div key={category.id} className={s.groupBlock}>
              <span className={s.groupLabel}>{category.name}</span>

              {category.segment_classes.map((cls) => {
                const imageItem = imageSegmentClasses.find((c) => c.id === cls.id);
                const hasPoints = !!imageItem?.points.length;

                return (
                  <div
                    key={cls.id}
                    className={clsx(s.classItem, selectedSegmentClassId === cls.id && s.selected)}
                    onClick={() => onSelectSegmentClass(cls.id)}
                  >
                    <div
                      className={s.classColor}
                      style={{
                        background: `hsl(${cls.hue}, 70%, 50%)`,
                      }}
                    />
                    <span className={s.classLabel}>{cls.name}</span>
                    <span className={clsx(s.classCount, hasPoints && s.has)}>
                      {hasPoints ? `${imageItem?.points.length} пол.` : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {!!ungroupedClasses.length && (
            <div className={s.groupBlock}>
              <span className={s.groupLabel}>Без категории</span>

              {ungroupedClasses.map((segmentClass) => {
                const imageItem = imageSegmentClasses.find((item) => item.id === segmentClass.id);
                const hasPoints = !!imageItem?.points.length;

                return (
                  <div
                    key={segmentClass.id}
                    className={clsx(
                      s.classItem,
                      selectedSegmentClassId === segmentClass.id && s.selected
                    )}
                    onClick={() => onSelectSegmentClass(segmentClass.id)}
                  >
                    <div
                      className={s.classColor}
                      style={{
                        background: `hsl(${segmentClass.hue}, 70%, 50%)`,
                      }}
                    />
                    <span className={s.classLabel}>{segmentClass.name}</span>
                    <span className={clsx(s.classCount, hasPoints && s.has)}>
                      {hasPoints ? `${imageItem?.points.length} пол.` : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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
        {/* <Button
          variant="ml"
          size="sm"
          disabled={isRefining || !selectedImgSeg?.points?.length}
          onClick={onRefine}
        >
          Уточнить
        </Button> */}
        <Button
          variant="ghost"
          size="sm"
          disabled={!selectedSegmentClassId}
          onClick={() => onStartDraw("polygon")}
        >
          Полигон
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!selectedSegmentClassId}
          onClick={() => onStartDraw("scissors")}
        >
          Умные ножницы
        </Button>
      </div>
    </div>
  );
};
