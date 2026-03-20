import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image, Layer, Line, Stage } from "react-konva";
import useImage from "use-image";

const SNAP_RADIUS = 10;
const EDGE_HIT_RADIUS = 15;
const DEFAULT_HUE = 0;

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const hasPoints = (seg) => Array.isArray(seg?.points) && seg.points.length > 0;

function segmentColor(hue, isSelected) {
  return {
    stroke: isSelected ? `hsl(${hue},80%,35%)` : `hsl(${hue},65%,45%)`,
    fill: `hsla(${hue},65%,45%,0.2)`,
  };
}

function nearestEdgeInsert(canvasPoints, cx, cy) {
  let best = { dist: Infinity, index: -1, point: null };

  for (let i = 0; i < canvasPoints.length; i++) {
    const [ax, ay] = canvasPoints[i];
    const [bx, by] = canvasPoints[(i + 1) % canvasPoints.length];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : clamp(((cx - ax) * dx + (cy - ay) * dy) / lenSq, 0, 1);
    const px = ax + t * dx;
    const py = ay + t * dy;
    const dist = Math.hypot(cx - px, cy - py);

    if (dist < best.dist) {
      best = { dist, index: i + 1, point: [px, py] };
    }
  }
  return best;
}

export default function StandardCanvas({
  imageUrl,
  segments,
  segmentGroups,
  selectedId,
  onFinishDrawing,
  onPointsChange,
  onSelect,
}) {
  const containerRef = useRef(null);
  const lineRefs = useRef({});
  const [image] = useImage(imageUrl);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drawingPts, setDrawingPts] = useState([]);
  const [localOverride, setLocalOverride] = useState(null);

  const hueOf = (seg) => {
    if (!seg?.segment_group_id) return DEFAULT_HUE;
    const group = segmentGroups.find((g) => g.id === seg.segment_group_id);
    return group?.hue || DEFAULT_HUE;
  };

  const selectedSeg = segments.find((s) => s.id === selectedId);
  const isDrawing = (selectedId && !hasPoints(selectedSeg)) || drawingPts.length > 0;
  const isEditing = selectedId && hasPoints(selectedSeg) && !isDrawing;

  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (prevSelectedId !== selectedId) {
    setPrevSelectedId(selectedId);
    if (drawingPts.length > 0) setDrawingPts([]);
    if (localOverride) setLocalOverride(null);
  }

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

  const imageRect = image
    ? (() => {
        const scale = Math.min(
          (size.width - 32) / image.naturalWidth,
          (size.height - 32) / image.naturalHeight
        );
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        return {
          scale,
          width,
          height,
          offsetX: (size.width - width) / 2,
          offsetY: (size.height - height) / 2,
        };
      })()
    : { scale: 1, width: 0, height: 0, offsetX: 0, offsetY: 0 };

  const toImage = (cx, cy) => [
    Math.round((cx - imageRect.offsetX) / imageRect.scale),
    Math.round((cy - imageRect.offsetY) / imageRect.scale),
  ];

  const toCanvas = (ix, iy) => [
    imageRect.offsetX + ix * imageRect.scale,
    imageRect.offsetY + iy * imageRect.scale,
  ];

  const clampToImage = (cx, cy) => [
    clamp(cx, imageRect.offsetX, imageRect.offsetX + imageRect.width),
    clamp(cy, imageRect.offsetY, imageRect.offsetY + imageRect.height),
  ];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height })
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const persist = (id, points) => {
    setLocalOverride({ id, points });
    onPointsChange(id, points);
  };

  const handleStageClick = (e) => {
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

  const handleLineClick = (seg, e) => {
    if (seg.id !== selectedId) return onSelect(seg.id);

    e.cancelBubble = true;
    const pos = e.target.getStage().getPointerPosition();
    const canvasPts = seg.points.map(([ix, iy]) => toCanvas(ix, iy));
    const { index, point, dist } = nearestEdgeInsert(canvasPts, pos.x, pos.y);

    if (dist > EDGE_HIT_RADIUS || !point) return;

    const newPoints = [...seg.points];
    newPoints.splice(index, 0, toImage(point[0], point[1]));
    persist(seg.id, newPoints);
  };

  const handleVertexDblClick = (seg, vi, e) => {
    e.cancelBubble = true;
    if (seg.points.length <= 3) return;
    persist(
      seg.id,
      seg.points.filter((_, i) => i !== vi)
    );
  };

  const handleVertexDragMove = (seg, vi, e) => {
    e.cancelBubble = true;
    const lineNode = lineRefs.current[seg.id];
    if (!lineNode) return;
    const points = seg.points.map(([ix, iy]) => toCanvas(ix, iy));
    points[vi] = [e.target.x(), e.target.y()];
    lineNode.points(points.flat());
    lineNode.getLayer().batchDraw();
  };

  const handleVertexDragEnd = (seg, vi, e) => {
    e.cancelBubble = true;
    const point = toImage(e.target.x(), e.target.y());
    persist(
      seg.id,
      seg.points.map((p, i) => (i === vi ? point : p))
    );
  };

  const handleGroupDragEnd = (seg, e) => {
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

  const dragBound = (seg) => (pos) => {
    const points = seg.points.map(([ix, iy]) => toCanvas(ix, iy));
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
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

  const defaultCursor = isDrawing ? "crosshair" : "default";
  const setCursor = (e, cursor) => {
    e.target.getStage().container().style.cursor = cursor;
  };

  const drawingCanvasPts = drawingPts.map(([ix, iy]) => toCanvas(ix, iy));
  const drawingHue = selectedSeg ? hueOf(selectedSeg) : DEFAULT_HUE;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        width={size.width}
        height={size.height}
        style={{ cursor: defaultCursor }}
        onClick={handleStageClick}
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
          {displaySegments.map((seg) => {
            if (!hasPoints(seg)) return null;

            const isSelected = seg.id === selectedId;
            const hue = hueOf(seg);
            const canvasPts = seg.points.map(([ix, iy]) => toCanvas(ix, iy));
            const { stroke, fill } = segmentColor(hue, isSelected);

            return (
              <Group
                key={seg.id}
                draggable={isSelected && isEditing}
                dragBoundFunc={isSelected && isEditing ? dragBound(seg) : undefined}
                onDragEnd={isSelected && isEditing ? (e) => handleGroupDragEnd(seg, e) : undefined}
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
                  onClick={(e) => handleLineClick(seg, e)}
                />

                {isSelected &&
                  isEditing &&
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
                      dragBoundFunc={(pos) => {
                        const [nx, ny] = clampToImage(pos.x, pos.y);
                        return { x: nx, y: ny };
                      }}
                      onDragStart={(e) => {
                        e.cancelBubble = true;
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

        {isDrawing && drawingCanvasPts.length > 0 && (
          <Layer>
            <Line
              points={drawingCanvasPts.flat()}
              stroke={`hsl(${drawingHue},65%,45%)`}
              strokeWidth={2}
              closed={false}
              listening={false}
            />
            {drawingCanvasPts.map(([cx, cy], i) => (
              <Circle
                key={i}
                x={cx}
                y={cy}
                radius={i === 0 ? 6 : 3}
                fill={i === 0 ? `hsl(${drawingHue},65%,45%)` : "white"}
                stroke={i === 0 ? "white" : "black"}
                strokeWidth={2}
                listening={false}
              />
            ))}
          </Layer>
        )}
      </Stage>
    </div>
  );
}
