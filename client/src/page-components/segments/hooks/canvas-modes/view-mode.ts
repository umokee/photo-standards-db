import type { CanvasModeDefinition, ViewModeContext } from "./types";

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
}: ViewModeContext): CanvasModeDefinition {
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
