import { RefObject } from "react";
import type {
  CanvasLineNode,
  CanvasModeDefinition,
  CanvasPointer,
  CanvasPointerEvent,
} from "./types";

export function createDrawPolygonMode({
  image,
  selectedId,
  isDragging,
  draftOutlineRef,
  draftLineRef,
  draftPoints,
  readCanvasPointer,
  clampToImage,
  clearPreviewState,
  setDraftPreviewPoint,
  setDraftPoints,
  addDraftPoint,
  finishDraftPolygon,
  tryFinishDraftPolygon,
  updateLine,
  toCanvas,
  toImage,
}: {
  image: HTMLImageElement | null;
  selectedId: string | null;
  isDragging: RefObject<boolean>;
  draftLineRef: RefObject<CanvasLineNode | null>;
  draftOutlineRef: RefObject<CanvasLineNode | null>;
  draftPoints: number[][];
  readCanvasPointer: (e: CanvasPointerEvent) => CanvasPointer;
  clampToImage: (cx: number, cy: number) => [number, number];
  clearPreviewState: () => void;
  setDraftPreviewPoint: (value: [number, number] | null) => void;
  setDraftPoints: React.Dispatch<React.SetStateAction<number[][]>>;
  addDraftPoint: (cx: number, cy: number) => void;
  finishDraftPolygon: () => void;
  tryFinishDraftPolygon: (cx: number, cy: number) => boolean;
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
    label: "Режим полигона",
    hint: "ЛКМ: добавить/передвинуть(зажать)/удалить(дважды) вершину | ПКМ: сбросить | Колесо: масштаб",
    stage: {
      handleStageClick(e) {
        if (!image || !selectedId) return;

        const { px, py } = readCanvasPointer(e);
        const clickedVertexHandle = e.target.getClassName?.() === "Rect";

        if (clickedVertexHandle) return;

        const [cx, cy] = clampToImage(px, py);

        if (tryFinishDraftPolygon(cx, cy)) return;
        addDraftPoint(cx, cy);
      },

      handleMouseMove(e) {
        if (draftPoints.length === 0) {
          clearPreviewState();
          return;
        }

        const { px, py } = readCanvasPointer(e);
        setDraftPreviewPoint(clampToImage(px, py) as [number, number]);
      },
    },

    editing: {
      handleLineClick() {},
      handleGroupDragStart() {},
      handleGroupDragEnd() {},
      handleVertexDragStart() {},
      handleVertexDragMove() {},
      handleVertexDragEnd() {},
      handleVertexDblClick() {},

      handleDrawingVertexDragStart(e) {
        e.cancelBubble = true;
        isDragging.current = true;
        clearPreviewState();
      },

      handleDrawingVertexDragMove(vi, e) {
        e.cancelBubble = true;
        const canvasPts = draftPoints.map(([ix, iy]) => toCanvas(ix, iy));
        updateLine(
          [draftOutlineRef.current, draftLineRef.current],
          canvasPts,
          vi,
          e.target.x(),
          e.target.y()
        );
      },

      handleDrawingVertexDragEnd(vi, e) {
        e.cancelBubble = true;
        isDragging.current = false;
        setDraftPreviewPoint(null);
        const point = toImage(e.target.x(), e.target.y());
        setDraftPoints((prev) => prev.map((p, i) => (i === vi ? point : p)));
      },

      handleDrawingVertexClick(vi, e) {
        if (e.evt.button !== 0) return;
        e.cancelBubble = true;
        if (isDragging.current) return;
        if (draftPoints.length <= 3) return;
        if (vi !== 0) return;
        finishDraftPolygon();
      },

      handleDrawingVertexDblClick(vi, e) {
        if (e.evt.button !== 0) return;
        e.cancelBubble = true;
        if (vi === 0) return;
        if (draftPoints.length <= 1) return;
        setDraftPoints((prev) => prev.filter((_, i) => i !== vi));
      },
    },
  };
}
