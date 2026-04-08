import useImageLayout from "@/page-components/segments/hooks/use-image-layout";
import { SegmentGroup, SegmentWithPoints } from "@/types/contracts";
import {
  clamp,
  EDGE_HIT_RADIUS,
  hasPoints,
  projectOnEdge,
  segmentColor,
  SNAP_RADIUS,
} from "@/utils/canvas";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Image, Layer, Line, Stage } from "react-konva";
import useImage from "use-image";

type Mode = "view" | "draw";

interface Props {
  imageUrl: string | null;
  segmentGroups: SegmentGroup[];
  segments: SegmentWithPoints[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFinishDrawing: (points: number[][]) => void;
  selectedContourIndex: number | null;
  onSelectContour: (index: number | null) => void;
  isDrawMode: boolean;
  onCancelDraw: () => void;
  onPointsChange: (segmentId: string, points: number[][][]) => void;
}

function useDrawingState(isDrawMode: boolean, selectedId: string | null) {
  const [mode, setMode] = useState<Mode>("view");
  const [drawingPts, setDrawingPts] = useState<number[][]>([]);
  const [drawGhost, setDrawGhost] = useState<[number, number] | null>(null);
  const [edgeGhost, setEdgeGhost] = useState<[number, number] | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    setMode(isDrawMode ? "draw" : "view");
    if (!isDrawMode) {
      setDrawingPts([]);
      setDrawGhost(null);
    }
  }, [isDrawMode]);

  useEffect(() => {
    setDrawingPts([]);
    setDrawGhost(null);
    setEdgeGhost(null);
  }, [selectedId]);

  return {
    mode,
    setMode,
    drawingPts,
    setDrawingPts,
    drawGhost,
    setDrawGhost,
    edgeGhost,
    setEdgeGhost,
    isDragging,
  };
}

export default function Canvas({
  imageUrl,
  segmentGroups,
  segments,
  selectedId,
  onSelect,
  onFinishDrawing,
  selectedContourIndex,
  onSelectContour,
  isDrawMode,
  onCancelDraw,
  onPointsChange,
}: Props) {
  const [image] = useImage(imageUrl);
  const { containerRef, size, imageRect, toImage, toCanvas, clampToImage } = useImageLayout(image);

  const stageRef = useRef<any>(null);
  const lineRefs = useRef<Record<string, any>>({});
  const drawingLineRef = useRef<any>(null);
  const pendingResetNode = useRef<any>(null);
  const isSpaceDown = useRef(false);
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const panConsumedClick = useRef(false);

  useLayoutEffect(() => {
    if (!pendingResetNode.current) return;
    const node = pendingResetNode.current;
    pendingResetNode.current = null;
    node.x(0);
    node.y(0);
    node.getLayer()?.batchDraw();
  });

  const {
    mode,
    setMode,
    drawingPts,
    setDrawingPts,
    drawGhost,
    setDrawGhost,
    edgeGhost,
    setEdgeGhost,
    isDragging,
  } = useDrawingState(isDrawMode, selectedId);

  const hueMap = useMemo(() => new Map(segmentGroups.map((g) => [g.id, g.hue])), [segmentGroups]);
  const hueOf = (seg: SegmentWithPoints | undefined) =>
    hueMap.get(seg?.segment_group_id ?? "") ?? 0;
  const selectedSeg = segments.find((s) => s.id === selectedId);
  const isDrawing = mode === "draw";

  const screenToStage = (stage: any, x: number, y: number): [number, number] => [
    (x - stage.x()) / stage.scaleX(),
    (y - stage.y()) / stage.scaleY(),
  ];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpaceDown.current = true;
        if (stageRef.current) stageRef.current.container().style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDown.current = false;
        if (stageRef.current)
          stageRef.current.container().style.cursor = isDrawing ? "crosshair" : "default";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isDrawing]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const newScale = clamp(e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1, 1, 20);
    stage.scale({ x: newScale, y: newScale });
    if (newScale === 1) {
      stage.position({ x: 0, y: 0 });
    } else {
      stage.position({
        x: pointer.x - (pointer.x - stage.x()) * (newScale / oldScale),
        y: pointer.y - (pointer.y - stage.y()) * (newScale / oldScale),
      });
    }
  };

  const handleStageMouseDown = (e: any) => {
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
    if (stageRef.current) stageRef.current.container().style.cursor = "grab";
  };

  const updateLine = (lineNode: any, canvasPts: number[][], vi: number, x: number, y: number) => {
    if (!lineNode) return;
    const pts = [...canvasPts];
    pts[vi] = [x, y];
    lineNode.points(pts.flat());
    lineNode.getLayer().batchDraw();
  };

  const setCursor = (e: any, cursor: string) => {
    e.target.getStage().container().style.cursor = cursor;
  };

  const handleStageClick = (e: any) => {
    if (e.evt.button !== 0) return;
    if (panConsumedClick.current) {
      panConsumedClick.current = false;
      return;
    }
    const stage = e.target.getStage();
    const raw = stage.getPointerPosition();
    const [px, py] = screenToStage(stage, raw.x, raw.y);
    const clickedEmpty = e.target === stage || e.target.getClassName() === "Image";

    if (isDrawing && image && selectedId) {
      const [cx, cy] = clampToImage(px, py);
      if (drawingPts.length >= 3) {
        const [fx, fy] = toCanvas(drawingPts[0][0], drawingPts[0][1]);
        if (Math.hypot(cx - fx, cy - fy) < SNAP_RADIUS) {
          onFinishDrawing([...drawingPts]);
          setDrawingPts([]);
          setMode("view");
          return;
        }
      }
      setDrawingPts((prev) => [...prev, toImage(cx, cy)]);
      return;
    }

    if (clickedEmpty) onSelect(null);
  };

  const handleMouseMove = (e: any) => {
    if (isPanning.current) {
      const stage = stageRef.current;
      const pos = stage.getPointerPosition();
      stage.position({
        x: stage.x() + pos.x - lastPanPos.current.x,
        y: stage.y() + pos.y - lastPanPos.current.y,
      });
      lastPanPos.current = pos;
      return;
    }
    if (isDragging.current) return;
    const stage = e.target.getStage();
    const raw = stage.getPointerPosition();
    const [px, py] = screenToStage(stage, raw.x, raw.y);

    if (isDrawing && drawingPts.length > 0) {
      setDrawGhost(clampToImage(px, py) as [number, number]);
      if (edgeGhost) setEdgeGhost(null);
      return;
    }

    if (!isDrawing && selectedId && selectedContourIndex !== null) {
      const seg = segments.find((s) => s.id === selectedId);
      const contour = seg?.points[selectedContourIndex];
      if (contour?.length) {
        const canvasPts = contour.map(([x, y]: number[]) => toCanvas(x, y));
        const { dist, point } = projectOnEdge(canvasPts, px, py);
        if (dist <= EDGE_HIT_RADIUS && point) {
          setEdgeGhost(point as [number, number]);
          if (drawGhost) setDrawGhost(null);
          return;
        }
      }
    }

    if (drawGhost) setDrawGhost(null);
    if (edgeGhost) setEdgeGhost(null);
  };

  const handleDrawingVertexDragStart = (e: any) => {
    e.cancelBubble = true;
    isDragging.current = true;
    setDrawGhost(null);
    setEdgeGhost(null);
  };

  const handleDrawingVertexDragMove = (vi: number, e: any) => {
    e.cancelBubble = true;
    const canvasPts = drawingPts.map(([ix, iy]) => toCanvas(ix, iy));
    updateLine(drawingLineRef.current, canvasPts, vi, e.target.x(), e.target.y());
  };

  const handleDrawingVertexDragEnd = (vi: number, e: any) => {
    e.cancelBubble = true;
    isDragging.current = false;
    setDrawGhost(null);
    const point = toImage(e.target.x(), e.target.y());
    setDrawingPts((prev) => prev.map((p, j) => (j === vi ? point : p)));
  };

  const handleDrawingVertexDblClick = (vi: number, e: any) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    if (drawingPts.length <= 1) return;
    setDrawingPts((prev) => prev.filter((_, j) => j !== vi));
  };

  const handleLineClick = (seg: SegmentWithPoints, ci: number, e: any) => {
    if (e.evt.button !== 0) return;
    if (isDrawing) return;
    if (isSpaceDown.current) return;
    if (seg.id !== selectedId) {
      onSelect(seg.id);
      onSelectContour(ci);
      return;
    }

    e.cancelBubble = true;
    onSelectContour(ci);

    const stage = e.target.getStage();
    const raw = stage.getPointerPosition();
    const [px, py] = screenToStage(stage, raw.x, raw.y);
    const contour = seg.points[ci];
    const canvasPts = contour.map(([ix, iy]: number[]) => toCanvas(ix, iy));
    const { index, point, dist } = projectOnEdge(canvasPts, px, py);
    if (dist > EDGE_HIT_RADIUS || !point) return;

    const newContour = [...contour];
    newContour.splice(index, 0, toImage(point[0], point[1]));
    onPointsChange(
      seg.id,
      seg.points.map((c, i) => (i === ci ? newContour : c))
    );
  };

  const handleGroupDragStart = (e: any) => {
    if (isSpaceDown.current) {
      e.target.stopDrag();
      return;
    }
    isDragging.current = true;
    setEdgeGhost(null);
  };

  const handleVertexDragStart = (e: any) => {
    if (isSpaceDown.current) {
      e.target.stopDrag();
      return;
    }
    e.cancelBubble = true;
    isDragging.current = true;
    setDrawGhost(null);
    setEdgeGhost(null);
  };

  const handleVertexDragMove = (seg: SegmentWithPoints, ci: number, vi: number, e: any) => {
    e.cancelBubble = true;
    const canvasPts = seg.points[ci].map(([x, y]: number[]) => toCanvas(x, y));
    updateLine(lineRefs.current[`${seg.id}-${ci}`], canvasPts, vi, e.target.x(), e.target.y());
  };

  const handleVertexDragEnd = (seg: SegmentWithPoints, ci: number, vi: number, e: any) => {
    e.cancelBubble = true;
    isDragging.current = false;
    setEdgeGhost(null);
    const pt = toImage(e.target.x(), e.target.y());
    onPointsChange(
      seg.id,
      seg.points.map((c, i) => (i === ci ? c.map((p, j) => (j === vi ? pt : p)) : c))
    );
  };

  const handleVertexDblClick = (seg: SegmentWithPoints, ci: number, vi: number, e: any) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    if (seg.points[ci].length <= 3) return;
    onPointsChange(
      seg.id,
      seg.points.map((c, i) => (i === ci ? c.filter((_, j) => j !== vi) : c))
    );
  };

  const handleGroupDragEnd = (seg: SegmentWithPoints, ci: number, e: any) => {
    isDragging.current = false;
    setEdgeGhost(null);
    const node = e.target;
    const dx = node.x();
    const dy = node.y();
    const newContour = seg.points[ci].map(([ix, iy]: number[]) => {
      const [cx, cy] = toCanvas(ix, iy);
      return toImage(cx + dx, cy + dy);
    });
    pendingResetNode.current = node;
    onPointsChange(
      seg.id,
      seg.points.map((c, i) => (i === ci ? newContour : c))
    );
  };

  const stageVertexBound = (pos: { x: number; y: number }) => {
    const stage = stageRef.current;
    const sc = stage.scaleX();
    const sx = stage.x(),
      sy = stage.y();
    const [lx, ly] = [(pos.x - sx) / sc, (pos.y - sy) / sc];
    const [cx, cy] = clampToImage(lx, ly);
    return { x: cx * sc + sx, y: cy * sc + sy };
  };

  const getGroupBound = (seg: SegmentWithPoints, ci: number) => (pos: { x: number; y: number }) => {
    const stage = stageRef.current;
    const sc = stage.scaleX();
    const sx = stage.x(),
      sy = stage.y();
    const lx = (pos.x - sx) / sc,
      ly = (pos.y - sy) / sc;

    const pts = seg.points[ci].map(([x, y]: number[]) => toCanvas(x, y));
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

  const defaultCursor = isDrawing ? "crosshair" : "default";
  const drawingCanvasPts = drawingPts.map(([ix, iy]) => toCanvas(ix, iy));
  const drawingStroke = `hsl(${hueOf(selectedSeg)},65%,45%)`;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", background: "#1a1a1a" }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (drawingPts.length > 0) {
          setDrawingPts([]);
          setDrawGhost(null);
          onCancelDraw();
        }
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        style={{ cursor: defaultCursor }}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        onMouseLeave={() => {
          isPanning.current = false;
          if (drawGhost) setDrawGhost(null);
          if (edgeGhost) setEdgeGhost(null);
        }}
      >
        <Layer>
          <Image
            image={image}
            x={imageRect.offsetX}
            y={imageRect.offsetY}
            width={imageRect.width}
            height={imageRect.height}
          />
        </Layer>

        <Layer>
          {segments.map((seg) => {
            if (!hasPoints(seg)) return null;
            const isSelected = seg.id === selectedId;
            const { stroke, fill } = segmentColor(hueOf(seg), isSelected);

            return (
              <Group key={seg.id}>
                {seg.points.map((contour, ci) => {
                  const canvasPts = contour.map(([ix, iy]: number[]) => toCanvas(ix, iy));
                  const isEditableContour = isSelected && selectedContourIndex === ci && !isDrawing;

                  return (
                    <Group
                      key={ci}
                      draggable={isEditableContour}
                      dragBoundFunc={isEditableContour ? getGroupBound(seg, ci) : undefined}
                      onDragStart={isEditableContour ? handleGroupDragStart : undefined}
                      onDragEnd={
                        isEditableContour ? (e) => handleGroupDragEnd(seg, ci, e) : undefined
                      }
                    >
                      <Line
                        ref={(node) => {
                          if (node) lineRefs.current[`${seg.id}-${ci}`] = node;
                        }}
                        points={canvasPts.flat()}
                        closed
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected ? 2 : 1}
                        lineCap="round"
                        lineJoin="round"
                        hitStrokeWidth={10}
                        opacity={isDrawing ? 0.15 : 0.75}
                        onClick={(e) => handleLineClick(seg, ci, e)}
                      />
                      {isEditableContour &&
                        canvasPts.map(([cx, cy], vi) => (
                          <Circle
                            key={vi}
                            x={cx}
                            y={cy}
                            radius={3}
                            fill="white"
                            stroke={stroke}
                            strokeWidth={1.5}
                            opacity={0.75}
                            draggable
                            dragBoundFunc={stageVertexBound}
                            onDragStart={handleVertexDragStart}
                            onDragMove={(e) => handleVertexDragMove(seg, ci, vi, e)}
                            onDragEnd={(e) => handleVertexDragEnd(seg, ci, vi, e)}
                            onDblClick={(e) => handleVertexDblClick(seg, ci, vi, e)}
                            onMouseEnter={(e) => setCursor(e, "grab")}
                            onMouseLeave={(e) => setCursor(e, defaultCursor)}
                          />
                        ))}
                    </Group>
                  );
                })}
              </Group>
            );
          })}
        </Layer>

        {isDrawing && drawingCanvasPts.length > 0 && (
          <Layer>
            <Line
              ref={drawingLineRef}
              points={drawingCanvasPts.flat()}
              stroke={drawingStroke}
              strokeWidth={2}
              dash={[6, 3]}
              closed={false}
              listening={false}
            />
            {drawingCanvasPts.map(([cx, cy], i) => (
              <Circle
                key={i}
                x={cx}
                y={cy}
                radius={i === 0 ? 5 : 3}
                fill={i === 0 ? drawingStroke : "white"}
                stroke={i === 0 ? "white" : drawingStroke}
                strokeWidth={2}
                draggable
                dragBoundFunc={stageVertexBound}
                onDragStart={handleDrawingVertexDragStart}
                onDragMove={(e) => handleDrawingVertexDragMove(i, e)}
                onDragEnd={(e) => handleDrawingVertexDragEnd(i, e)}
                onDblClick={(e) => handleDrawingVertexDblClick(i, e)}
                onMouseEnter={(e) => setCursor(e, "grab")}
                onMouseLeave={(e) => setCursor(e, "crosshair")}
              />
            ))}
          </Layer>
        )}

        {isDrawing && drawGhost && drawingCanvasPts.length > 0 && (
          <Layer>
            <Line
              points={[...drawingCanvasPts[drawingCanvasPts.length - 1], ...drawGhost]}
              stroke={drawingStroke}
              strokeWidth={1}
              dash={[4, 4]}
              opacity={0.5}
              listening={false}
            />
          </Layer>
        )}

        {!isDrawing && edgeGhost && (
          <Layer>
            <Circle
              x={edgeGhost[0]}
              y={edgeGhost[1]}
              radius={4}
              fill="white"
              stroke={segmentColor(hueOf(selectedSeg), true).stroke}
              strokeWidth={2}
              opacity={0.5}
              listening={false}
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
}
