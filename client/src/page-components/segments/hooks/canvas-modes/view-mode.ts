import { SegmentClassWithPoints } from "@/types/contracts";
import { RefObject } from "react";
import type {
  CanvasLineNode,
  CanvasModeDefinition,
  CanvasPointer,
  CanvasPointerEvent,
  CanvasTargetNode,
} from "./types";

export type ContourInsertTarget = {
  index: number;
  point: number[];
};

export function createViewMode({
  selectedId,
  hasSelectedContour,
  isSpaceDown,
  isDragging,
  contourFillRefs,
  contourLineRefs,
  contourOutlineRefs,
  pendingResetNode,
  readCanvasPointer,
  clearPreviewState,
  onSelect,
  onSelectContour,
  selectContour,
  insertVertexIntoContour,
  getContourInsertTarget,
  moveContour,
  moveVertex,
  removeVertex,
  updateLine,
  toCanvas,
  toImage,
}: {
  selectedId: string | null;
  hasSelectedContour: boolean;
  isSpaceDown: RefObject<boolean>;
  isDragging: RefObject<boolean>;
  contourFillRefs: RefObject<Record<string, CanvasLineNode>>;
  contourLineRefs: RefObject<Record<string, CanvasLineNode>>;
  contourOutlineRefs: RefObject<Record<string, CanvasLineNode>>;
  pendingResetNode: RefObject<CanvasTargetNode | null>;
  readCanvasPointer: (e: CanvasPointerEvent) => CanvasPointer;
  clearPreviewState: () => void;
  onSelect: (id: string | null) => void;
  onSelectContour: (index: number | null) => void;
  selectContour: (segment: SegmentClassWithPoints, contourIndex: number) => void;
  insertVertexIntoContour: (
    segment: SegmentClassWithPoints,
    contourIndex: number,
    insertion: ContourInsertTarget
  ) => void;
  getContourInsertTarget: (
    contour: number[][],
    px: number,
    py: number
  ) => ContourInsertTarget | null;
  moveContour: (
    segment: SegmentClassWithPoints,
    contourIndex: number,
    dx: number,
    dy: number
  ) => void;
  moveVertex: (
    segment: SegmentClassWithPoints,
    contourIndex: number,
    vertexIndex: number,
    nextPoint: number[]
  ) => void;
  removeVertex: (
    segment: SegmentClassWithPoints,
    contourIndex: number,
    vertexIndex: number
  ) => void;
  updateLine: (
    lineNodes: Array<CanvasLineNode | null | undefined>,
    canvasPts: number[][],
    vertexIndex: number,
    nextX: number,
    nextY: number
  ) => void;
  toCanvas: (ix: number, iy: number) => [number, number];
  toImage: (cx: number, cy: number) => [number, number];
}): CanvasModeDefinition {
  return {
    label: "Режим просмотра",
    hint: !selectedId
      ? "Выберите класс"
      : hasSelectedContour
        ? "ЛКМ: перетащить вершину/сегмент | Колесо: масштаб | Space: панорама"
        : "Колесо: масштаб | Space: панорама",
    stage: {
      handleStageClick(e) {
        const { stage } = readCanvasPointer(e);
        const clickedEmpty =
          e.target === (stage as unknown as typeof e.target) || e.target.getClassName() === "Image";

        if (clickedEmpty) onSelect(null);
      },

      handleMouseMove() {
        clearPreviewState();
      },
    },

    editing: {
      handleLineClick(seg, ci, e) {
        if (e.evt.button !== 0) return;
        if (isSpaceDown.current) return;

        if (seg.id !== selectedId) {
          selectContour(seg, ci);
          return;
        }

        e.cancelBubble = true;
        onSelectContour(ci);

        const { px, py } = readCanvasPointer(e);
        const insertion = getContourInsertTarget(seg.points[ci], px, py);
        if (!insertion) return;
        insertVertexIntoContour(seg, ci, insertion);
      },

      handleGroupDragStart(e) {
        if (isSpaceDown.current) {
          e.target.stopDrag();
          return;
        }

        isDragging.current = true;
      },

      handleGroupDragEnd(seg, ci, e) {
        isDragging.current = false;

        const node = e.target;
        const dx = node.x();
        const dy = node.y();

        pendingResetNode.current = node;
        moveContour(seg, ci, dx, dy);
      },

      handleVertexDragStart(e) {
        if (isSpaceDown.current) {
          e.target.stopDrag();
          return;
        }

        e.cancelBubble = true;
        isDragging.current = true;
        clearPreviewState();
      },

      handleVertexDragMove(seg, ci, vi, e) {
        e.cancelBubble = true;
        const canvasPts = seg.points[ci].map(([x, y]) => toCanvas(x, y));
        updateLine(
          [
            contourFillRefs.current[`${seg.id}-${ci}`],
            contourOutlineRefs.current[`${seg.id}-${ci}`],
            contourLineRefs.current[`${seg.id}-${ci}`],
          ],
          canvasPts,
          vi,
          e.target.x(),
          e.target.y()
        );
      },

      handleDrawingVertexClick() {},

      handleVertexDragEnd(seg, ci, vi, e) {
        e.cancelBubble = true;
        isDragging.current = false;
        const pt = toImage(e.target.x(), e.target.y());
        moveVertex(seg, ci, vi, pt);
      },

      handleVertexDblClick(seg, ci, vi, e) {
        if (e.evt.button !== 0) return;
        e.cancelBubble = true;
        if (seg.points[ci].length <= 3) return;
        removeVertex(seg, ci, vi);
      },

      handleDrawingVertexDragStart() {},
      handleDrawingVertexDragMove() {},
      handleDrawingVertexDragEnd() {},
      handleDrawingVertexDblClick() {},
    },
  };
}
