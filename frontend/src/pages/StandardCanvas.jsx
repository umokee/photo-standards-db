import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image, Layer, Line, Stage } from "react-konva";
import useImage from "use-image";

const HUES = [210, 150, 280, 30, 0, 170, 60, 320];

export default function StandardCanvas({
  imageUrl,
  segments,
  selectedId,
  mode,
  onCreate,
  onSelect,
  onDoubleClick,
  onUpdate,
}) {
  const containerRef = useRef(null);
  const lineRefs = useRef({});
  const vertexRefs = useRef({});
  const [image] = useImage(imageUrl);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const drawingHue = HUES[segments.length % HUES.length];

  const scale = image
    ? Math.min((size.width - 32) / image.naturalWidth, (size.height - 32) / image.naturalHeight)
    : 1;
  const imgW = image ? image.naturalWidth * scale : 0;
  const imgH = image ? image.naturalHeight * scale : 0;
  const offX = (size.width - imgW) / 2;
  const offY = (size.height - imgH) / 2;

  const toImage = (cx, cy) => [Math.round((cx - offX) / scale), Math.round((cy - offY) / scale)];
  const toCanvas = (ix, iy) => [offX + ix * scale, offY + iy * scale];
  const constrain = (val, min, max) => Math.min(Math.max(val, min), max);
  const constrainToImage = (cx, cy) => [
    constrain(cx, offX, offX + imgW),
    constrain(cy, offY, offY + imgH),
  ];

  const getCanvasPoints = (seg) => {
    if (!Array.isArray(seg.points)) return [];
    return seg.points.map(([ix, iy]) => toCanvas(ix, iy));
  };

  const getScreenPos = (seg) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !seg.points?.length) return { screenX: 0, screenY: 0 };
    const xs = seg.points.map(([x]) => x);
    const ys = seg.points.map(([, y]) => y);
    return {
      screenX: rect.left + offX + Math.max(...xs) * scale,
      screenY: rect.top + offY + Math.min(...ys) * scale,
    };
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const finishDrawing = () => {
    if (drawingPoints.length < 3) {
      setDrawingPoints([]);
      return;
    }
    const imagePoints = drawingPoints.map(([cx, cy]) => toImage(cx, cy));
    const popupPos = getScreenPos({ points: imagePoints });
    onCreate(imagePoints, popupPos);
    setDrawingPoints([]);
    setMousePos(null);
  };

  const isNearFirstPoint = (cx, cy) => {
    if (drawingPoints.length < 3) return false;
    const [fx, fy] = drawingPoints[0];
    const dist = Math.hypot(cx - fx, cy - fy);
    return dist < 10;
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        width={size.width}
        height={size.height}
        style={{ cursor: mode === "draw" ? "crosshair" : "default" }}
        onClick={(e) => {
          const stage = e.target.getStage();
          const pos = stage.getPointerPosition();
          const clickedOnEmpty = e.target === stage || e.target.getClassName() === "Image";

          if (mode === "draw" && image) {
            const [cx, cy] = constrainToImage(pos.x, pos.y);

            if (isNearFirstPoint(cx, cy)) {
              finishDrawing();
              return;
            }
            setDrawingPoints((prev) => [...prev, [cx, cy]]);
            return;
          }
          if (clickedOnEmpty) {
            onSelect(null);
          }
        }}
        onDblClick={() => {
          if (mode === "draw" && drawingPoints.length >= 3) finishDrawing();
        }}
        onMouseMove={(e) => {
          if (mode !== "draw" || drawingPoints.length === 0) return;
          const pos = e.target.getStage().getPointerPosition();
          const [cx, cy] = constrainToImage(pos.x, pos.y);
          setMousePos([cx, cy]);
        }}
      >
        <Layer>
          <Image image={image} x={offX} y={offY} width={imgW} height={imgH} />
        </Layer>
        <Layer>
          {segments.map((seg, i) => {
            const isSelected = seg.id === selectedId;
            const canvasPoints = getCanvasPoints(seg);
            if (canvasPoints.length === 0) return null;
            const hue = HUES[i % HUES.length];
            const color = isSelected ? `hsl(${hue}, 80%, 35%)` : `hsl(${hue}, 65%, 45%)`;
            const fill = `hsl(${hue}, 65%, 45%, 0.2)`;
            const flatPoints = canvasPoints.flat();

            return (
              <Group
                key={seg.id}
                draggable={isSelected && mode === "move"}
                dragBoundFunc={(pos) => {
                  const points = seg.points.map(([ix, iy]) => toCanvas(ix, iy));
                  const xs = points.map(([x]) => x);
                  const ys = points.map(([, y]) => y);
                  return {
                    x: constrain(pos.x, offX - Math.min(...xs), offX + imgW - Math.max(...xs)),
                    y: constrain(pos.y, offY - Math.min(...ys), offY + imgH - Math.max(...ys)),
                  };
                }}
                onDragEnd={(e) => {
                  const node = e.target;
                  const dx = node.x();
                  const dy = node.y();
                  const newPoints = seg.points.map(([ix, iy]) => {
                    const [cx, cy] = toCanvas(ix, iy);
                    return toImage(cx + dx, cy + dy);
                  });
                  const newCanvas = newPoints.map(([ix, iy]) => toCanvas(ix, iy));
                  const lineNode = lineRefs.current[seg.id];
                  if (lineNode) {
                    lineNode.points(newCanvas.flat());
                  }
                  const vertices = vertexRefs.current[seg.id];
                  if (vertices) {
                    newCanvas.forEach(([cx, cy], vi) => {
                      if (vertices[vi]) {
                        vertices[vi].x(cx);
                        vertices[vi].y(cy);
                      }
                    });
                  }
                  node.x(0);
                  node.y(0);
                  node.getLayer().batchDraw();
                  onUpdate(seg.id, { points: newPoints });
                }}
              >
                <Line
                  ref={(node) => {
                    if (node) lineRefs.current[seg.id] = node;
                  }}
                  points={flatPoints}
                  closed={true}
                  fill={fill}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1}
                  hitStrokeWidth={5}
                  onClick={() => onSelect(seg.id)}
                  onDblClick={() => onDoubleClick(seg, getScreenPos(seg))}
                />
                {isSelected &&
                  mode === "move" &&
                  canvasPoints.map(([cx, cy], vi) => (
                    <Circle
                      key={vi}
                      ref={(node) => {
                        if (!vertexRefs.current[seg.id]) vertexRefs.current[seg.id] = [];
                        vertexRefs.current[seg.id][vi] = node;
                      }}
                      x={cx}
                      y={cy}
                      radius={5}
                      fill="white"
                      stroke="black"
                      strokeWidth={2}
                      draggable={true}
                      dragBoundFunc={(pos) => {
                        const [nx, ny] = constrainToImage(pos.x, pos.y);
                        return { x: nx, y: ny };
                      }}
                      onDragStart={(e) => (e.cancelBubble = true)}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        const lineNode = lineRefs.current[seg.id];
                        if (!lineNode) return;
                        const base = seg.points.map(([ix, iy]) => toCanvas(ix, iy));
                        const updated = base.map((pt, j) =>
                          j === vi ? [e.target.x(), e.target.y()] : pt
                        );
                        lineNode.points(updated.flat());
                        lineNode.getLayer().batchDraw();
                      }}
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                        const newPt = toImage(e.target.x(), e.target.y());
                        const newPoints = seg.points.map((pt, j) => (j === vi ? newPt : pt));
                        onUpdate(seg.id, { points: newPoints });
                      }}
                      onMouseEnter={(e) => {
                        e.target.getStage().container().style.cursor = "grab";
                      }}
                      onMouseLeave={(e) => {
                        e.target.getStage().container().style.cursor =
                          mode === "draw" ? "crosshair" : "default";
                      }}
                    />
                  ))}
                {isSelected &&
                  mode === "view" &&
                  canvasPoints.map(([cx, cy], vi) => (
                    <Circle
                      key={vi}
                      x={cx}
                      y={cy}
                      radius={3}
                      fill="white"
                      stroke="black"
                      strokeWidth={2}
                      listening={false}
                    />
                  ))}
              </Group>
            );
          })}
        </Layer>
        {mode === "draw" && drawingPoints.length > 0 && (
          <Layer>
            <Line
              points={[...drawingPoints.flat(), ...(mousePos ?? [])]}
              stroke={`hsl(${drawingHue}, 65%, 45%)`}
              strokeWidth={2}
              closed={false}
              listening={false}
            />
            {drawingPoints.length >= 3 && (
              <Line
                points={drawingPoints.flat()}
                closed={true}
                fill={`hsl(${drawingHue}, 65%, 45%, 0.2)`}
                stroke={`hsl(${drawingHue}, 65%, 45%)`}
                listening={false}
              />
            )}
            {drawingPoints.map(([cx, cy], i) => (
              <Circle
                key={i}
                x={cx}
                y={cy}
                radius={i === 0 ? 5 : 3}
                fill={i === 0 ? `hsl(${drawingHue}, 65%, 45%)` : "white"}
                stroke="black"
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
