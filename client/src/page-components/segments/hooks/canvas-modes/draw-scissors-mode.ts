import type {
  CanvasModeDefinition,
  CanvasPointer,
  CanvasPointerEvent,
} from "@/page-components/segments/hooks/canvas-modes/types";
import {
  useScissorsEngine,
  type EngineStatus,
} from "@/page-components/segments/hooks/use-scissors-engine";
import { SNAP_RADIUS } from "@/utils/canvas";
import { simplifyPath } from "@/utils/simplify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SIMPLIFY_EPSILON_PX = 1.4;

type Params = {
  isActive: boolean;
  image: HTMLImageElement | null;
  selectedId: string | null;
  readCanvasPointer: (e: CanvasPointerEvent) => CanvasPointer;
  clampToImage: (cx: number, cy: number) => [number, number];
  toCanvas: (ix: number, iy: number) => [number, number];
  toImage: (cx: number, cy: number) => [number, number];
  onFinishDrawing: (polygon: number[][]) => void;
  onExit: () => void;
};

/**
 * Режим Intelligent Scissors.
 *
 * UX:
 *   1. ЛКМ — поставить первый seed. Движок строит карту путей от него.
 *   2. Водим мышкой — показывается live-превью пути от последнего seed'а до курсора.
 *   3. ЛКМ — зафиксировать сегмент и поставить следующий seed.
 *   4. Двойной клик или клик рядом с первым seed — замкнуть полигон и завершить.
 *   5. ПКМ — откатить последний seed. Если seed'ов нет — выйти из режима.
 *
 * Внутреннее состояние (seeds, committedSegments, livePath) живёт здесь,
 * а не в useCanvas — потому что оно специфично только для этого режима.
 */
export function useDrawScissors({
  isActive,
  image,
  selectedId,
  readCanvasPointer,
  clampToImage,
  toCanvas,
  toImage,
  onFinishDrawing,
  onExit,
}: Params) {
  const { status, error, init, setImage, buildMap, getPath } = useScissorsEngine();

  const [seeds, setSeeds] = useState<number[][]>([]);
  // committedSegments[i] = путь seeds[i] → seeds[i+1] включительно с обоих концов
  const [committedSegments, setCommittedSegments] = useState<number[][][]>([]);
  const [livePath, setLivePath] = useState<number[][] | null>(null);

  // последний seed, для которого уже построена карта
  const mappedSeedRef = useRef<[number, number] | null>(null);
  // rAF-троттлинг для getPath
  const rafRef = useRef<number | null>(null);
  const pendingTargetRef = useRef<[number, number] | null>(null);
  // генерация — getPath результат применяется только если сид не поменялся с момента запроса
  const genRef = useRef(0);

  const reset = useCallback(() => {
    setSeeds([]);
    setCommittedSegments([]);
    setLivePath(null);
    mappedSeedRef.current = null;
    pendingTargetRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    genRef.current++;
  }, []);

  // Инициализация движка + загрузка картинки, когда входим в режим
  useEffect(() => {
    if (!isActive || !image) return;
    let cancelled = false;

    (async () => {
      try {
        await init();
        if (cancelled) return;
        await setImage(image);
      } catch {
        /* статус движка и сообщение об ошибке видны через status/error */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive, image, init, setImage]);

  // Сброс состояния при выходе из режима или смене класса/картинки
  useEffect(() => {
    if (!isActive) reset();
  }, [isActive, reset]);
  useEffect(() => {
    reset();
  }, [selectedId, image, reset]);

  const scheduleLivePath = useCallback(
    (target: [number, number]) => {
      pendingTargetRef.current = target;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(async () => {
        rafRef.current = null;
        const t = pendingTargetRef.current;
        if (!t) return;
        if (status !== "ready" || !mappedSeedRef.current) return;

        const localGen = genRef.current;
        try {
          const path = await getPath(t);
          if (localGen !== genRef.current) return;
          setLivePath(path);
        } catch {
          if (localGen !== genRef.current) return;
          setLivePath(null);
        }
      });
    },
    [getPath, status]
  );

  const placeSeedAndBuild = useCallback(
    async (imagePoint: number[]) => {
      const [ix, iy] = imagePoint;
      setSeeds((prev) => [...prev, [ix, iy]]);
      mappedSeedRef.current = null;
      setLivePath(null);
      genRef.current++;

      try {
        await buildMap([ix, iy]);
        mappedSeedRef.current = [ix, iy];
      } catch {
        /* ошибка попадёт в status */
      }
    },
    [buildMap]
  );

  const commitAndAdvance = useCallback(
    async (targetImagePoint: number[]) => {
      // Commit: нужно получить путь от текущего mapped-seed'а до target.
      if (!mappedSeedRef.current) return;
      const current = genRef.current;
      let path: number[][];
      try {
        path = await getPath(targetImagePoint as [number, number]);
      } catch {
        return;
      }
      if (current !== genRef.current) return;

      setCommittedSegments((prev) => [...prev, path]);
      await placeSeedAndBuild(targetImagePoint);
    },
    [getPath, placeSeedAndBuild]
  );

  const finish = useCallback(async () => {
    if (seeds.length < 3) return;

    // замыкающий сегмент: от последнего seed'а к seeds[0]
    if (!mappedSeedRef.current) return;
    const current = genRef.current;
    let closing: number[][];
    try {
      closing = await getPath(seeds[0] as [number, number]);
    } catch {
      return;
    }
    if (current !== genRef.current) return;

    const allSegments = [...committedSegments, closing];
    if (allSegments.length === 0) return;

    // Склейка: первый сегмент целиком, последующие без первой точки (= предыдущий seed).
    // Последний замыкающий — без первой И последней точки (последняя = seeds[0], уже есть в начале).
    const polygon: number[][] = [...allSegments[0]];
    for (let i = 1; i < allSegments.length; i++) {
      const seg = allSegments[i];
      const trimmed = i === allSegments.length - 1 ? seg.slice(1, -1) : seg.slice(1);
      for (const p of trimmed) polygon.push(p);
    }

    const simplified = simplifyPath(polygon, SIMPLIFY_EPSILON_PX);
    onFinishDrawing(simplified);
    reset();
  }, [committedSegments, getPath, onFinishDrawing, reset, seeds]);

  const popLastSeed = useCallback(() => {
    if (seeds.length === 0) {
      onExit();
      return;
    }

    setSeeds((prev) => prev.slice(0, -1));
    setCommittedSegments((prev) => prev.slice(0, -1));
    setLivePath(null);
    genRef.current++;

    // нужно пересобрать карту на предпоследний seed
    const prev = seeds[seeds.length - 2];
    mappedSeedRef.current = null;
    if (prev) {
      (async () => {
        try {
          await buildMap(prev as [number, number]);
          mappedSeedRef.current = prev as [number, number];
        } catch {
          /* noop */
        }
      })();
    }
  }, [buildMap, onExit, seeds]);

  const hint = useMemo(() => {
    if (!selectedId) return "Выберите класс";
    if (status === "initializing") return "Загрузка OpenCV...";
    if (status === "loadingImage") return "Подготовка кадра...";
    if (status === "error") return `Ошибка движка: ${error ?? ""}`;
    if (status === "building") return "Построение карты стоимости...";
    if (seeds.length === 0) return "ЛКМ: поставить первый якорь | ESC/ПКМ: отмена";
    return "ЛКМ: якорь | Двойной клик или клик по первому: замкнуть | ПКМ: откатить";
  }, [error, seeds.length, selectedId, status]);

  const mode: CanvasModeDefinition = {
    label: "Режим ножниц",
    hint,
    stage: {
      handleStageClick(e) {
        if (!image || !selectedId) return;
        if (status !== "ready") return;

        const { px, py } = readCanvasPointer(e);
        const [cx, cy] = clampToImage(px, py);
        const targetImage = toImage(cx, cy);

        // Первый клик — первый seed.
        if (seeds.length === 0) {
          placeSeedAndBuild(targetImage);
          return;
        }

        // Клик рядом с seeds[0] при достаточном числе якорей — замкнуть.
        if (seeds.length >= 3) {
          const [fx, fy] = toCanvas(seeds[0][0], seeds[0][1]);
          if (Math.hypot(cx - fx, cy - fy) < SNAP_RADIUS) {
            finish();
            return;
          }
        }

        commitAndAdvance(targetImage);
      },

      handleMouseMove(e) {
        if (seeds.length === 0 || status !== "ready") {
          if (livePath !== null) setLivePath(null);
          return;
        }

        const { px, py } = readCanvasPointer(e);
        const [cx, cy] = clampToImage(px, py);
        scheduleLivePath(toImage(cx, cy) as [number, number]);
      },

      handleRightClick() {
        popLastSeed();
      },
    },

    // Во время drawing существующие полигоны не редактируются — все hooks пустые.
    editing: {
      handleLineClick() {},
      handleGroupDragStart() {},
      handleGroupDragEnd() {},
      handleVertexDragStart() {},
      handleVertexDragMove() {},
      handleVertexDragEnd() {},
      handleVertexDblClick() {},
      handleDrawingVertexDragStart() {},
      handleDrawingVertexDragMove() {},
      handleDrawingVertexDragEnd() {},
      handleDrawingVertexClick(vi) {
        // Клик по первому якорю — замкнуть (эквивалент клика по стартовой точке)
        if (vi === 0 && seeds.length >= 3) finish();
      },
      handleDrawingVertexDblClick(_vi, e) {
        if (e.evt.button !== 0) return;
        e.cancelBubble = true;
        finish();
      },
    },
  };

  return {
    mode,
    seeds,
    committedSegments,
    livePath,
    engineStatus: status as EngineStatus,
    reset,
  };
}
