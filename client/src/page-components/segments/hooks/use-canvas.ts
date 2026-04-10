import { createDrawPolygonMode } from "@/page-components/segments/hooks/canvas-modes/draw-polygon-mode";
import type {
  CanvasLineNode,
  CanvasPointerEvent,
  CanvasStageNode,
  CanvasTargetNode,
} from "@/page-components/segments/hooks/canvas-modes/types";
import { createViewMode } from "@/page-components/segments/hooks/canvas-modes/view-mode";
import type { SegmentGroup, SegmentWithPoints } from "@/types/contracts";
import { clamp, EDGE_HIT_RADIUS, projectOnEdge, SNAP_RADIUS } from "@/utils/canvas";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export type CanvasMode = { type: "view" } | { type: "draw-polygon" };

type Params = {
  segmentGroups: SegmentGroup[];
  segments: SegmentWithPoints[];
  selectedId: string | null;
  selectedContourIndex: number | null;
  isDrawMode: boolean;
  image: HTMLImageElement | null;
  imageRect: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  toImage: (cx: number, cy: number) => [number, number];
  toCanvas: (ix: number, iy: number) => [number, number];
  clampToImage: (cx: number, cy: number) => [number, number];
  onSelect: (id: string | null) => void;
  onSelectContour: (index: number | null) => void;
  onFinishDrawing: (points: number[][]) => void;
  onPointsChange: (segmentId: string, points: number[][][]) => void;
  onCancelDraw: () => void;
};

export function useCanvas({
  segmentGroups,
  segments,
  selectedId,
  selectedContourIndex,
  isDrawMode,
  image,
  imageRect,
  toImage,
  toCanvas,
  clampToImage,
  onSelect,
  onSelectContour,
  onFinishDrawing,
  onPointsChange,
  onCancelDraw,
}: Params) {
  const contourFillRefs = useRef<Record<string, CanvasLineNode>>({});
  const contourLineRefs = useRef<Record<string, CanvasLineNode>>({});
  const contourOutlineRefs = useRef<Record<string, CanvasLineNode>>({});
  const draftOutlineRef = useRef<CanvasLineNode | null>(null);
  const draftLineRef = useRef<CanvasLineNode | null>(null);
  const pendingResetNode = useRef<CanvasTargetNode | null>(null);
  const stageRef = useRef<KonvaStage | null>(null);
  const isSpaceDown = useRef(false);
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const panConsumedClick = useRef(false);
  const isDragging = useRef(false);

  const [mode, setMode] = useState<CanvasMode>({ type: "view" });
  const [draftPoints, setDraftPoints] = useState<number[][]>([]);
  const [draftPreviewPoint, setDraftPreviewPoint] = useState<[number, number] | null>(null);
  const [viewportScale, setViewportScale] = useState(1);
  const isDrawing = mode.type !== "view";

  const screenToStage = (stage: CanvasStageNode, x: number, y: number): [number, number] => [
    (x - stage.x()) / stage.scaleX(),
    (y - stage.y()) / stage.scaleY(),
  ];

  useEffect(() => {
    setMode(isDrawMode ? { type: "draw-polygon" } : { type: "view" });

    if (!isDrawMode) {
      setDraftPoints([]);
      setDraftPreviewPoint(null);
    }
  }, [isDrawMode]);

  useEffect(() => {
    setDraftPoints([]);
    setDraftPreviewPoint(null);
  }, [selectedId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpaceDown.current = true;

        if (stageRef.current) {
          stageRef.current.container().style.cursor = "grab";
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDown.current = false;

        if (stageRef.current) {
          stageRef.current.container().style.cursor = isDrawing ? "crosshair" : "default";
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isDrawing]);

  useLayoutEffect(() => {
    if (!pendingResetNode.current) return;

    const node = pendingResetNode.current;
    pendingResetNode.current = null;
    node.x(0);
    node.y(0);
    node.getLayer()?.batchDraw();
  });

  const hueMap = useMemo(
    () => new Map(segmentGroups.map((group) => [group.id, group.hue])),
    [segmentGroups]
  );

  const hueOf = (segment: SegmentWithPoints | undefined) =>
    hueMap.get(segment?.segment_group_id ?? "") ?? 0;

  const selectedSeg = useMemo(
    () => segments.find((segment) => segment.id === selectedId),
    [segments, selectedId]
  );

  const selectedContour = useMemo(() => {
    if (!selectedSeg || selectedContourIndex === null) return null;
    return selectedSeg.points[selectedContourIndex] ?? null;
  }, [selectedSeg, selectedContourIndex]);

  const draftStroke = `hsl(${hueOf(selectedSeg)}, 65%, 45%)`;
  const draftCanvasPoints = draftPoints.map(([ix, iy]) => toCanvas(ix, iy));
  const defaultCursor = isDrawing ? "crosshair" : "default";

  const updateLine = (
    lineNodes: Array<CanvasLineNode | null | undefined>,
    canvasPts: number[][],
    vi: number,
    x: number,
    y: number
  ) => {
    const pts = [...canvasPts];
    pts[vi] = [x, y];
    const flatPoints = pts.flat();

    lineNodes.filter(Boolean).forEach((lineNode) => {
      lineNode.points(flatPoints);
      lineNode.getLayer()?.batchDraw();
    });
  };

  const setCursor = (e: CanvasPointerEvent, cursor: string) => {
    e.target.getStage().container().style.cursor = cursor;
  };

  const clearPreviewState = () => setDraftPreviewPoint(null);

  const handleWheel = (e: CanvasPointerEvent) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const newScale = clamp(e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1, 1, 20);

    stage.scale({ x: newScale, y: newScale });
    setViewportScale(newScale);

    if (newScale === 1) {
      stage.position({ x: 0, y: 0 });
      return;
    }

    stage.position({
      x: pointer.x - (pointer.x - stage.x()) * (newScale / oldScale),
      y: pointer.y - (pointer.y - stage.y()) * (newScale / oldScale),
    });
  };

  const handleStageMouseDown = (e: CanvasPointerEvent) => {
    if (!isSpaceDown.current) return;

    isPanning.current = true;
    panConsumedClick.current = true;

    const pos = e.target.getStage().getPointerPosition();
    lastPanPos.current = pos;
    e.target.getStage().container().style.cursor = "grabbing";
  };

  const handleStageMouseUp = () => {
    if (!isPanning.current) return;

    isPanning.current = false;

    if (stageRef.current) {
      stageRef.current.container().style.cursor = isSpaceDown.current
        ? "grab"
        : isDrawing
          ? "crosshair"
          : "default";
    }
  };

  const panIfNeeded = () => {
    if (!isPanning.current) return false;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();

    stage.position({
      x: stage.x() + pos.x - lastPanPos.current.x,
      y: stage.y() + pos.y - lastPanPos.current.y,
    });

    lastPanPos.current = pos;
    return true;
  };

  const readCanvasPointer = (e: CanvasPointerEvent) => {
    const stage = e.target.getStage();
    const raw = stage.getPointerPosition();
    const [px, py] = screenToStage(stage, raw.x, raw.y);

    return { stage, px, py };
  };

  const shouldIgnoreStageClick = (e: CanvasPointerEvent) => {
    if (e.evt.button !== 0) return true;

    if (panConsumedClick.current) {
      panConsumedClick.current = false;
      return true;
    }

    return false;
  };

  const getContourInsertTarget = (
    contour: number[][],
    px: number,
    py: number
  ): { index: number; point: number[] } | null => {
    const canvasPts = contour.map(([ix, iy]) => toCanvas(ix, iy));
    const { index, point, dist } = projectOnEdge(canvasPts, px, py);

    if (dist > EDGE_HIT_RADIUS || !point) return null;

    return { index, point: toImage(point[0], point[1]) };
  };

  const updateContour = (
    segmentId: string,
    contourIndex: number,
    nextContour: number[][],
    sourceContours: number[][][]
  ) => {
    onPointsChange(
      segmentId,
      sourceContours.map((contour, index) => (index === contourIndex ? nextContour : contour))
    );
  };

  const tryFinishDraftPolygon = (cx: number, cy: number) => {
    if (draftPoints.length < 3) return false;

    const [fx, fy] = toCanvas(draftPoints[0][0], draftPoints[0][1]);
    if (Math.hypot(cx - fx, cy - fy) >= SNAP_RADIUS) return false;

    onFinishDrawing([...draftPoints]);
    setDraftPoints([]);
    setMode({ type: "view" });
    return true;
  };

  const addDraftPoint = (cx: number, cy: number) => {
    setDraftPoints((prev) => [...prev, toImage(cx, cy)]);
  };

  const moveContour = (
    segment: SegmentWithPoints,
    contourIndex: number,
    dx: number,
    dy: number
  ) => {
    const nextContour = segment.points[contourIndex].map(([ix, iy]) => {
      const [cx, cy] = toCanvas(ix, iy);
      return toImage(cx + dx, cy + dy);
    });

    updateContour(segment.id, contourIndex, nextContour, segment.points);
  };

  const moveVertex = (
    segment: SegmentWithPoints,
    contourIndex: number,
    vertexIndex: number,
    nextPoint: number[]
  ) => {
    updateContour(
      segment.id,
      contourIndex,
      segment.points[contourIndex].map((point, index) =>
        index === vertexIndex ? nextPoint : point
      ),
      segment.points
    );
  };

  const removeVertex = (segment: SegmentWithPoints, contourIndex: number, vertexIndex: number) => {
    updateContour(
      segment.id,
      contourIndex,
      segment.points[contourIndex].filter((_, index) => index !== vertexIndex),
      segment.points
    );
  };

  const selectContour = (segment: SegmentWithPoints, contourIndex: number) => {
    onSelect(segment.id);
    onSelectContour(contourIndex);
  };

  const insertVertexIntoContour = (
    segment: SegmentWithPoints,
    contourIndex: number,
    insertion: { index: number; point: number[] }
  ) => {
    const nextContour = [...segment.points[contourIndex]];
    nextContour.splice(insertion.index, 0, insertion.point);
    updateContour(segment.id, contourIndex, nextContour, segment.points);
  };

  const viewMode = createViewMode({
    selectedId,
    isSpaceDown,
    isDragging,
    contourFillRefs,
    contourLineRefs,
    contourOutlineRefs,
    pendingResetNode,
    readCanvasPointer,
    hasSelectedContour: !!selectedContour,
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
  });

  const drawPolygonMode = createDrawPolygonMode({
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
    tryFinishDraftPolygon,
    updateLine,
    toCanvas,
    toImage,
  });


  const activeMode =
    mode.type === "view"
      ? viewMode
      : mode.type === "draw-polygon"
        ? drawPolygonMode
        : null;

  const modeLabel = activeMode.label;
  const hintText = activeMode.hint;

  const handleStageClick = (e: CanvasPointerEvent) => {
    if (shouldIgnoreStageClick(e)) return;
    activeMode.stage.handleStageClick(e);
  };

  const handleMouseMove = (e: CanvasPointerEvent) => {
    if (panIfNeeded()) return;
    if (isDragging.current) return;
    activeMode.stage.handleMouseMove(e);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (draftPoints.length > 0) {
      setDraftPoints([]);
      clearPreviewState();
      onCancelDraw();
    }
  };

  const handleMouseLeave = () => {
    isPanning.current = false;
    clearPreviewState();
  };

  const activeEditing = activeMode.editing;

  const stageVertexBound = (pos: { x: number; y: number }) => {
    const stage = stageRef.current;
    const sc = stage.scaleX();
    const sx = stage.x();
    const sy = stage.y();
    const [lx, ly] = [(pos.x - sx) / sc, (pos.y - sy) / sc];
    const [cx, cy] = clampToImage(lx, ly);
    return { x: cx * sc + sx, y: cy * sc + sy };
  };

  const getGroupBound = (seg: SegmentWithPoints, ci: number) => (pos: { x: number; y: number }) => {
    const stage = stageRef.current;
    const sc = stage.scaleX();
    const sx = stage.x();
    const sy = stage.y();
    const lx = (pos.x - sx) / sc;
    const ly = (pos.y - sy) / sc;

    const pts = seg.points[ci].map(([x, y]) => toCanvas(x, y));
    const xs = pts.map(([x]) => x);
    const ys = pts.map(([, y]) => y);

    const cx = clamp(
      lx,
      imageRect.offsetX - Math.min(...xs),
      imageRect.offsetX + imageRect.width - Math.max(...xs)
    );
    const cy = clamp(
      ly,
      imageRect.offsetY - Math.min(...ys),
      imageRect.offsetY + imageRect.height - Math.max(...ys)
    );

    return { x: cx * sc + sx, y: cy * sc + sy };
  };

  return {
    viewport: {
      stageRef,
      isSpaceDown,
      isPanning,
      panConsumedClick,
      handleWheel,
      handleStageMouseDown,
      handleStageMouseUp,
      panIfNeeded,
    },
    draft: {
      mode,
      setMode,
      draftPoints,
      setDraftPoints,
      draftPreviewPoint,
      setDraftPreviewPoint,
      isDragging,
    },
    isDrawing,
    draftStroke,
    draftCanvasPoints,
    defaultCursor,
    modeLabel,
    hintText,
    viewportScale,
    contourFillRefs,
    contourLineRefs,
    contourOutlineRefs,
    draftOutlineRef,
    draftLineRef,
    hueOf,
    setCursor,
    handleStageClick,
    handleMouseMove,
    handleContextMenu,
    handleMouseLeave,
    handleDrawingVertexDragStart: activeEditing.handleDrawingVertexDragStart,
    handleDrawingVertexDragMove: activeEditing.handleDrawingVertexDragMove,
    handleDrawingVertexDragEnd: activeEditing.handleDrawingVertexDragEnd,
    handleDrawingVertexDblClick: activeEditing.handleDrawingVertexDblClick,
    handleLineClick: activeEditing.handleLineClick,
    handleGroupDragStart: activeEditing.handleGroupDragStart,
    handleGroupDragEnd: activeEditing.handleGroupDragEnd,
    handleVertexDragStart: activeEditing.handleVertexDragStart,
    handleVertexDragMove: activeEditing.handleVertexDragMove,
    handleVertexDragEnd: activeEditing.handleVertexDragEnd,
    handleVertexDblClick: activeEditing.handleVertexDblClick,
    stageVertexBound,
    getGroupBound,
  };
}
