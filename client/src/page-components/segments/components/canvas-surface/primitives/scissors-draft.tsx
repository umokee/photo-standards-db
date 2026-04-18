import type { CanvasPointerEvent } from "@/page-components/segments/hooks/canvas-modes/types";
import { Layer, Line } from "react-konva";
import { VertexHandle } from "./vertex-handle";

type Props = {
  seedsCanvas: number[][];
  committedCanvasSegments: number[][][];
  livePathCanvas: number[][] | null;
  stroke: string;
  viewportScale?: number;
  onSeedClick: (index: number, e: CanvasPointerEvent) => void;
  onSeedDblClick: (index: number, e: CanvasPointerEvent) => void;
  onSeedMouseEnter?: (e: CanvasPointerEvent) => void;
  onSeedMouseLeave?: (e: CanvasPointerEvent) => void;
};

/**
 * Рендер драфта в режиме ножниц.
 *
 * В отличие от polygon-драфта, здесь у нас:
 *   - несколько committed-сегментов (ломаные по пикселям от Dijkstra)
 *   - seeds — якоря (квадратные хэндлы)
 *   - live-сегмент — пунктир от последнего seed'а до курсора
 */
export function ScissorsDraft({
  seedsCanvas,
  committedCanvasSegments,
  livePathCanvas,
  stroke,
  viewportScale = 1,
  onSeedClick,
  onSeedDblClick,
  onSeedMouseEnter,
  onSeedMouseLeave,
}: Props) {
  if (seedsCanvas.length === 0) return null;

  const visualScale = 1 / Math.max(viewportScale, 1);
  const outlineWidth = 4 * visualScale;
  const mainWidth = 2.25 * visualScale;
  const previewWidth = 1.5 * visualScale;

  // Схлопываем все committed сегменты в одну ломаную для рендера:
  // первый целиком + каждый следующий без первой точки (дубликат seed'а).
  const committedFlat: number[] = [];
  committedCanvasSegments.forEach((seg, i) => {
    const points = i === 0 ? seg : seg.slice(1);
    for (const [x, y] of points) {
      committedFlat.push(x, y);
    }
  });

  const lastSeed = seedsCanvas[seedsCanvas.length - 1];
  const livePreviewFlat =
    livePathCanvas && livePathCanvas.length > 0
      ? livePathCanvas.flat()
      : lastSeed
        ? [...lastSeed]
        : [];

  return (
    <Layer>
      {committedFlat.length >= 4 && (
        <>
          <Line
            points={committedFlat}
            stroke="rgba(255, 255, 255, 0.92)"
            strokeWidth={outlineWidth}
            listening={false}
            lineJoin="round"
            lineCap="round"
          />
          <Line
            points={committedFlat}
            stroke={stroke}
            strokeWidth={mainWidth}
            listening={false}
            lineJoin="round"
            lineCap="round"
          />
        </>
      )}

      {livePreviewFlat.length >= 4 && (
        <Line
          points={livePreviewFlat}
          stroke={stroke}
          strokeWidth={previewWidth}
          dash={[8, 6]}
          opacity={0.9}
          listening={false}
          lineJoin="round"
          lineCap="round"
        />
      )}

      {seedsCanvas.map(([cx, cy], index) => (
        <VertexHandle
          key={index}
          x={cx}
          y={cy}
          viewportScale={viewportScale}
          radius={index === 0 ? 6 : 5}
          stroke={stroke}
          isAnchor={index === 0}
          onClick={(e) => onSeedClick(index, e)}
          onDblClick={(e) => onSeedDblClick(index, e)}
          onMouseEnter={onSeedMouseEnter}
          onMouseLeave={onSeedMouseLeave}
        />
      ))}
    </Layer>
  );
}
