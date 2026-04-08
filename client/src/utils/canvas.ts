import { SegmentWithPoints } from "@/types/contracts";

export const SNAP_RADIUS = 10;
export const EDGE_HIT_RADIUS = 15;

export const clamp = (val: number, min: number, max: number) => {
  return Math.min(Math.max(val, min), max);
};

export const hasPoints = (seg: SegmentWithPoints | undefined | null) => {
  return Array.isArray(seg?.points) && seg.points.length > 0;
};

export function segmentColor(hue: number, isSelected: boolean) {
  return {
    stroke: isSelected ? `hsl(${hue},80%,35%)` : `hsl(${hue},65%,45%)`,
    fill: `hsla(${hue},65%,45%,0.6)`,
  };
}

export function projectOnEdge(canvasPoints: number[][], cx: number, cy: number) {
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
