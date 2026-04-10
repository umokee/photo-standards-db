import type { CanvasPointerEvent } from "@/page-components/segments/hooks/canvas-modes/types";
import { Group, Rect } from "react-konva";

type Props = {
  x: number;
  y: number;
  stroke: string;
  viewportScale?: number;
  radius?: number;
  fill?: string;
  innerFill?: string;
  opacity?: number;
  draggable?: boolean;
  isAnchor?: boolean;
  dragBoundFunc?: ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined;
  onDragStart?: (e: CanvasPointerEvent) => void;
  onDragMove?: (e: CanvasPointerEvent) => void;
  onDragEnd?: (e: CanvasPointerEvent) => void;
  onDblClick?: (e: CanvasPointerEvent) => void;
  onMouseEnter?: (e: CanvasPointerEvent) => void;
  onMouseLeave?: (e: CanvasPointerEvent) => void;
};

export function VertexHandle({
  x,
  y,
  stroke,
  viewportScale = 1,
  radius = 5,
  fill = "rgba(255, 255, 255, 0.96)",
  innerFill = "rgba(20, 22, 26, 0.96)",
  opacity = 1,
  draggable = false,
  isAnchor = false,
  dragBoundFunc,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDblClick,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const outerSize = (isAnchor ? radius + 1 : radius) * 2;
  const innerSize = isAnchor ? 3 : 2;
  const markerRotation = isAnchor ? 45 : 0;
  const fixedScale = 1 / Math.max(viewportScale, 1);

  return (
    <Group
      x={x}
      y={y}
      rotation={markerRotation}
      scaleX={fixedScale}
      scaleY={fixedScale}
      draggable={draggable}
      dragBoundFunc={dragBoundFunc}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDblClick={onDblClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Rect
        x={-outerSize / 2}
        y={-outerSize / 2}
        width={outerSize}
        height={outerSize}
        cornerRadius={0}
        fill={fill}
        stroke={isAnchor ? stroke : "rgba(26, 28, 33, 0.92)"}
        strokeWidth={isAnchor ? 1.75 : 1}
        opacity={opacity}
      />
      <Rect
        x={-innerSize / 2}
        y={-innerSize / 2}
        width={innerSize}
        height={innerSize}
        cornerRadius={0}
        fill={isAnchor ? stroke : innerFill}
      />
    </Group>
  );
}
