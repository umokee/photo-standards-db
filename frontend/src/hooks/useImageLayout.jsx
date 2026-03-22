import { useEffect, useRef, useState } from "react";
import { clamp } from "../utils/canvas";

export default function useImageLayout(image) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height })
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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

  const vertexBound = (pos) => {
    const [nx, ny] = clampToImage(pos.x, pos.y);
    return { x: nx, y: ny };
  };

  return { containerRef, size, imageRect, toImage, toCanvas, clampToImage, vertexBound };
}
