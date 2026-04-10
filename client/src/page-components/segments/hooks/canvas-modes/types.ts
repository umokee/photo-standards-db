import type { SegmentWithPoints } from "@/types/contracts";
import type { RefObject } from "react";

export type CanvasLayerNode = {
  batchDraw: () => void;
};

export type CanvasLineNode = {
  points: (points: number[]) => void;
  getLayer: () => CanvasLayerNode | null;
};

export type CanvasStageNode = {
  x: {
    (): number;
    (value: number): void;
  };
  y: {
    (): number;
    (value: number): void;
  };
  scaleX: () => number;
  scaleY: () => number;
  scale: (next: { x: number; y: number }) => void;
  position: (next: { x: number; y: number }) => void;
  getPointerPosition: () => { x: number; y: number };
  container: () => { style: { cursor: string } };
  getClassName?: () => string;
};

export type CanvasTargetNode = {
  x: {
    (): number;
    (value: number): void;
  };
  y: {
    (): number;
    (value: number): void;
  };
  stopDrag: () => void;
  getStage: () => CanvasStageNode;
  getClassName?: () => string;
  getLayer?: () => CanvasLayerNode | null;
};

export type CanvasPointerEvent = {
  evt: {
    button?: number;
    deltaY?: number;
    preventDefault?: () => void;
  };
  target: CanvasTargetNode;
  cancelBubble?: boolean;
};

export type CanvasStageHandlers = {
  handleStageClick: (e: CanvasPointerEvent) => void;
  handleMouseMove: (e: CanvasPointerEvent) => void;
};

export type CanvasEditHandlers = {
  handleLineClick: (seg: SegmentWithPoints, ci: number, e: CanvasPointerEvent) => void;
  handleGroupDragStart: (e: CanvasPointerEvent) => void;
  handleGroupDragEnd: (seg: SegmentWithPoints, ci: number, e: CanvasPointerEvent) => void;
  handleVertexDragStart: (e: CanvasPointerEvent) => void;
  handleVertexDragMove: (
    seg: SegmentWithPoints,
    ci: number,
    vi: number,
    e: CanvasPointerEvent
  ) => void;
  handleVertexDragEnd: (
    seg: SegmentWithPoints,
    ci: number,
    vi: number,
    e: CanvasPointerEvent
  ) => void;
  handleVertexDblClick: (
    seg: SegmentWithPoints,
    ci: number,
    vi: number,
    e: CanvasPointerEvent
  ) => void;
  handleDrawingVertexDragStart: (e: CanvasPointerEvent) => void;
  handleDrawingVertexDragMove: (vi: number, e: CanvasPointerEvent) => void;
  handleDrawingVertexDragEnd: (vi: number, e: CanvasPointerEvent) => void;
  handleDrawingVertexDblClick: (vi: number, e: CanvasPointerEvent) => void;
};

export type CanvasModeDefinition = {
  label: string;
  hint: string;
  stage: CanvasStageHandlers;
  editing: CanvasEditHandlers;
};

export type CanvasPointer = {
  stage: CanvasStageNode;
  px: number;
  py: number;
};

export type ContourInsertTarget = {
  index: number;
  point: number[];
};

export type ViewModeContext = {
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
  selectContour: (segment: SegmentWithPoints, contourIndex: number) => void;
  insertVertexIntoContour: (
    segment: SegmentWithPoints,
    contourIndex: number,
    insertion: ContourInsertTarget
  ) => void;
  getContourInsertTarget: (
    contour: number[][],
    px: number,
    py: number
  ) => ContourInsertTarget | null;
  moveContour: (segment: SegmentWithPoints, contourIndex: number, dx: number, dy: number) => void;
  moveVertex: (
    segment: SegmentWithPoints,
    contourIndex: number,
    vertexIndex: number,
    nextPoint: number[]
  ) => void;
  removeVertex: (segment: SegmentWithPoints, contourIndex: number, vertexIndex: number) => void;
  updateLine: (
    lineNodes: Array<CanvasLineNode | null | undefined>,
    canvasPts: number[][],
    vertexIndex: number,
    nextX: number,
    nextY: number
  ) => void;
  toCanvas: (ix: number, iy: number) => [number, number];
  toImage: (cx: number, cy: number) => [number, number];
};

export type DrawPolygonModeContext = {
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
};
