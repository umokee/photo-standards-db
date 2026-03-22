import { useRef, useState } from "react";
import { Circle, Group, Image, Layer, Line, Stage } from "react-konva";
import useImage from "use-image";
import useImageLayout from "../../hooks/useImageLayout";
import {
  clamp,
  EDGE_HIT_RADIUS,
  hasPoints,
  projectOnEdge,
  segmentColor,
  SNAP_RADIUS,
} from "../../utils/canvas";

export default function Canvas({
  imageUrl,
  segments,
  segmentGroups,
  selectedId,
  onFinishDrawing,
  onPointsChange,
  onSelect,
}) {
  const [image] = useImage(imageUrl);
  const { containerRef, size, imageRect, toImage, toCanvas, clampToImage, vertexBound } =
    useImageLayout(image);

  // --- рефы (все локальные, никуда не передаются) ---

  const lineRefs = useRef({});
  const drawingLineRef = useRef(null);
  const isDragging = useRef(false);

  // --- стейт ---

  const [drawingPts, setDrawingPts] = useState([]);
  const [localOverride, setLocalOverride] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);

  // --- derived ---

  const hueOf = (seg) => segmentGroups.find((g) => g.id === seg?.segment_group_id)?.hue ?? 0;

  const selectedSeg = segments.find((s) => s.id === selectedId);
  const isClosed = hasPoints(selectedSeg);
  const isDrawing = (selectedId && !isClosed) || drawingPts.length > 0;

  // --- сброс при смене выделения (render-time adjustment) ---

  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (prevSelectedId !== selectedId) {
    setPrevSelectedId(selectedId);
    if (drawingPts.length > 0) setDrawingPts([]);
    if (localOverride) setLocalOverride(null);
  }

  // --- sync localOverride с сервером ---

  if (localOverride) {
    const server = segments.find((s) => s.id === localOverride.id);
    if (server && JSON.stringify(server.points) === JSON.stringify(localOverride.points)) {
      setLocalOverride(null);
    }
  }

  const displaySegments = localOverride
    ? segments.map((seg) =>
        seg.id === localOverride.id ? { ...seg, points: localOverride.points } : seg
      )
    : segments;

  // --- persist (optimistic local + callback наверх) ---

  const persist = (id, points) => {
    setLocalOverride({ id, points });
    onPointsChange(id, points);
  };

  // --- императивное обновление Line при драге (без React-рендера) ---

  const updateLine = (lineNode, canvasPts, vi, x, y) => {
    if (!lineNode) return;
    const pts = [...canvasPts];
    pts[vi] = [x, y];
    lineNode.points(pts.flat());
    lineNode.getLayer().batchDraw();
  };

  // ===================== HANDLERS =====================

  // --- stage click ---

  const handleStageClick = (e) => {
    if (e.evt.button !== 0) return;
    const pos = e.target.getStage().getPointerPosition();
    const clickedEmpty = e.target === e.target.getStage() || e.target.getClassName() === "Image";

    if (isDrawing && image) {
      const [cx, cy] = clampToImage(pos.x, pos.y);

      if (drawingPts.length >= 3) {
        const [fx, fy] = toCanvas(...drawingPts[0]);
        if (Math.hypot(cx - fx, cy - fy) < SNAP_RADIUS) {
          onFinishDrawing([...drawingPts]);
          setDrawingPts([]);
          return;
        }
      }

      setDrawingPts((prev) => [...prev, toImage(cx, cy)]);
      return;
    }

    if (clickedEmpty) onSelect(null);
  };

  // --- mouse move (ghost routing) ---

  const handleMouseMove = (e) => {
    if (isDragging.current) return;
    const pos = e.target.getStage().getPointerPosition();

    if (isDrawing && drawingPts.length > 0) {
      setGhostPos(clampToImage(pos.x, pos.y));
      return;
    }

    if (selectedId) {
      const seg = displaySegments.find((s) => s.id === selectedId);
      if (seg && hasPoints(seg)) {
        const canvasPts = seg.points.map(([x, y]) => toCanvas(x, y));
        const { dist, point } = projectOnEdge(canvasPts, pos.x, pos.y);
        if (dist <= EDGE_HIT_RADIUS && point) {
          setGhostPos(point);
          return;
        }
      }
    }

    if (ghostPos) setGhostPos(null);
  };

  // --- drawing: vertex drag ---

  const handleDrawingDragMove = (vi, e) => {
    e.cancelBubble = true;
    const canvasPts = drawingPts.map(([ix, iy]) => toCanvas(ix, iy));
    updateLine(drawingLineRef.current, canvasPts, vi, e.target.x(), e.target.y());
  };

  const handleDrawingDragEnd = (vi, e) => {
    e.cancelBubble = true;
    isDragging.current = false;
    setGhostPos(null);
    const point = toImage(e.target.x(), e.target.y());
    setDrawingPts((prev) => prev.map((p, j) => (j === vi ? point : p)));
  };

  const handleDrawingDblClick = (vi, e) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    if (drawingPts.length <= 1) return;
    setDrawingPts((prev) => prev.filter((_, j) => j !== vi));
  };

  // --- segments: line click (select or insert vertex) ---

  const handleLineClick = (seg, e) => {
    if (e.evt.button !== 0) return;
    if (isDrawing) return;
    if (seg.id !== selectedId) return onSelect(seg.id);

    e.cancelBubble = true;
    const pos = e.target.getStage().getPointerPosition();
    const canvasPts = seg.points.map(([ix, iy]) => toCanvas(ix, iy));
    const { index, point, dist } = projectOnEdge(canvasPts, pos.x, pos.y);
    if (dist > EDGE_HIT_RADIUS || !point) return;

    const newPoints = [...seg.points];
    newPoints.splice(index, 0, toImage(point[0], point[1]));
    persist(seg.id, newPoints);
  };

  // --- segments: vertex drag ---

  const handleVertexDragMove = (seg, vi, e) => {
    e.cancelBubble = true;
    const canvasPts = seg.points.map(([x, y]) => toCanvas(x, y));
    updateLine(lineRefs.current[seg.id], canvasPts, vi, e.target.x(), e.target.y());
  };

  const handleVertexDragEnd = (seg, vi, e) => {
    e.cancelBubble = true;
    isDragging.current = false;
    setGhostPos(null);
    const pt = toImage(e.target.x(), e.target.y());
    persist(
      seg.id,
      seg.points.map((p, i) => (i === vi ? pt : p))
    );
  };

  const handleVertexDblClick = (seg, vi, e) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    if (seg.points.length <= 3) return;
    persist(
      seg.id,
      seg.points.filter((_, i) => i !== vi)
    );
  };

  // --- segments: group drag ---

  const handleGroupDragEnd = (seg, e) => {
    isDragging.current = false;
    setGhostPos(null);
    const node = e.target;
    const dx = node.x();
    const dy = node.y();
    node.x(0);
    node.y(0);
    persist(
      seg.id,
      seg.points.map(([ix, iy]) => {
        const [cx, cy] = toCanvas(ix, iy);
        return toImage(cx + dx, cy + dy);
      })
    );
  };

  const groupBound = (seg) => (pos) => {
    const canvasPts = seg.points.map(([x, y]) => toCanvas(x, y));
    const xs = canvasPts.map(([x]) => x);
    const ys = canvasPts.map(([, y]) => y);
    return {
      x: clamp(
        pos.x,
        imageRect.offsetX - Math.min(...xs),
        imageRect.offsetX + imageRect.width - Math.max(...xs)
      ),
      y: clamp(
        pos.y,
        imageRect.offsetY - Math.min(...ys),
        imageRect.offsetY + imageRect.height - Math.max(...ys)
      ),
    };
  };

  // ===================== RENDER =====================

  const defaultCursor = isDrawing ? "crosshair" : "default";
  const setCursor = (e, cursor) => {
    e.target.getStage().container().style.cursor = cursor;
  };

  const drawingCanvasPts = drawingPts.map(([ix, iy]) => toCanvas(ix, iy));
  const drawingHue = selectedSeg ? hueOf(selectedSeg) : 0;
  const drawingStroke = `hsl(${drawingHue},65%,45%)`;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (drawingPts.length > 0) {
          setDrawingPts([]);
          setLocalOverride(null);
          onSelect(null);
        }
      }}
    >
      <Stage
        width={size.width}
        height={size.height}
        style={{ cursor: defaultCursor }}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => ghostPos && setGhostPos(null)}
      >
        {/* Фоновое изображение */}
        <Layer>
          <Image
            image={image}
            x={imageRect.offsetX}
            y={imageRect.offsetY}
            width={imageRect.width}
            height={imageRect.height}
          />
        </Layer>

        {/* Существующие сегменты */}
        <Layer>
          {displaySegments.map((seg) => {
            if (!hasPoints(seg)) return null;
            const isSelected = seg.id === selectedId;
            const hue = hueOf(seg);
            const canvasPts = seg.points.map(([ix, iy]) => toCanvas(ix, iy));
            const { stroke, fill } = segmentColor(hue, isSelected);

            return (
              <Group
                key={seg.id}
                draggable={isSelected}
                dragBoundFunc={isSelected ? groupBound(seg) : undefined}
                onDragStart={() => {
                  isDragging.current = true;
                  setGhostPos(null);
                }}
                onDragEnd={isSelected ? (e) => handleGroupDragEnd(seg, e) : undefined}
              >
                <Line
                  ref={(node) => {
                    if (node) lineRefs.current[seg.id] = node;
                  }}
                  points={canvasPts.flat()}
                  closed
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 2 : 1}
                  hitStrokeWidth={10}
                  opacity={isDrawing ? 0.15 : 1}
                  onClick={(e) => handleLineClick(seg, e)}
                />

                {isSelected &&
                  canvasPts.map(([cx, cy], vi) => (
                    <Circle
                      key={vi}
                      x={cx}
                      y={cy}
                      radius={5}
                      fill="white"
                      stroke={stroke}
                      strokeWidth={2}
                      draggable
                      dragBoundFunc={vertexBound}
                      onDragStart={(e) => {
                        e.cancelBubble = true;
                        isDragging.current = true;
                        setGhostPos(null);
                      }}
                      onDragMove={(e) => handleVertexDragMove(seg, vi, e)}
                      onDragEnd={(e) => handleVertexDragEnd(seg, vi, e)}
                      onDblClick={(e) => handleVertexDblClick(seg, vi, e)}
                      onMouseEnter={(e) => setCursor(e, "grab")}
                      onMouseLeave={(e) => setCursor(e, defaultCursor)}
                    />
                  ))}
              </Group>
            );
          })}
        </Layer>

        {/* Рисование нового полигона */}
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
                radius={i === 0 ? 6 : 4}
                fill={i === 0 ? drawingStroke : "white"}
                stroke={i === 0 ? "white" : drawingStroke}
                strokeWidth={2}
                draggable
                dragBoundFunc={vertexBound}
                onDragStart={(e) => {
                  e.cancelBubble = true;
                  isDragging.current = true;
                  setGhostPos(null);
                }}
                onDragMove={(e) => handleDrawingDragMove(i, e)}
                onDragEnd={(e) => handleDrawingDragEnd(i, e)}
                onDblClick={(e) => handleDrawingDblClick(i, e)}
                onMouseEnter={(e) => setCursor(e, "grab")}
                onMouseLeave={(e) => setCursor(e, "crosshair")}
              />
            ))}
          </Layer>
        )}

        {/* Ghost-индикатор */}
        {ghostPos && (
          <Layer>
            {isDrawing && drawingCanvasPts.length > 0 && (
              <Line
                points={[...drawingCanvasPts[drawingCanvasPts.length - 1], ...ghostPos]}
                stroke={drawingStroke}
                strokeWidth={1}
                dash={[4, 4]}
                opacity={0.5}
                listening={false}
              />
            )}
            <Circle
              x={ghostPos[0]}
              y={ghostPos[1]}
              radius={4}
              fill={isDrawing ? drawingStroke : "white"}
              stroke={
                isDrawing
                  ? "white"
                  : segmentColor(selectedSeg ? hueOf(selectedSeg) : 0, true).stroke
              }
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
