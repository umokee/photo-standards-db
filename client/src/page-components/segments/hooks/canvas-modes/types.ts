import type { SegmentClassWithPoints } from "@/types/contracts";

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
  handleLineClick: (seg: SegmentClassWithPoints, ci: number, e: CanvasPointerEvent) => void;
  handleGroupDragStart: (e: CanvasPointerEvent) => void;
  handleGroupDragEnd: (seg: SegmentClassWithPoints, ci: number, e: CanvasPointerEvent) => void;
  handleVertexDragStart: (e: CanvasPointerEvent) => void;
  handleVertexDragMove: (
    seg: SegmentClassWithPoints,
    ci: number,
    vi: number,
    e: CanvasPointerEvent
  ) => void;
  handleVertexDragEnd: (
    seg: SegmentClassWithPoints,
    ci: number,
    vi: number,
    e: CanvasPointerEvent
  ) => void;
  handleVertexDblClick: (
    seg: SegmentClassWithPoints,
    ci: number,
    vi: number,
    e: CanvasPointerEvent
  ) => void;
  handleDrawingVertexDragStart: (e: CanvasPointerEvent) => void;
  handleDrawingVertexDragMove: (vi: number, e: CanvasPointerEvent) => void;
  handleDrawingVertexDragEnd: (vi: number, e: CanvasPointerEvent) => void;
  handleDrawingVertexClick: (vi: number, e: CanvasPointerEvent) => void;
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
