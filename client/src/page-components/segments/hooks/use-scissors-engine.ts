import { useCallback, useEffect, useRef, useState } from "react";

export type EngineStatus = "off" | "initializing" | "ready" | "loadingImage" | "building" | "error";

type PendingCall = {
  resolve: (payload: unknown) => void;
  reject: (err: Error) => void;
};

export function useScissorsEngine() {
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const pendingRef = useRef<Map<number, PendingCall>>(new Map());
  const initializedRef = useRef(false);
  const [status, setStatus] = useState<EngineStatus>("off");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("./workers/scissors-worker.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<{ id: number; type: string; payload?: unknown }>) => {
      const { id, type, payload } = e.data;
      const pending = pendingRef.current.get(id);
      if (!pending) return;
      pendingRef.current.delete(id);

      if (type === "ok") pending.resolve(payload);
      else pending.reject(new Error(String(payload ?? "worker error")));
    };

    worker.onerror = (e) => {
      setStatus("error");
      setError(e.message || "worker error");
    };

    workerRef.current = worker;

    return () => {
      pendingRef.current.clear();
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const call = useCallback(
    <T = unknown>(type: string, payload?: unknown, transfer?: Transferable[]): Promise<T> => {
      return new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error("worker not ready"));
          return;
        }
        const id = ++reqIdRef.current;
        pendingRef.current.set(id, { resolve: resolve as (v: unknown) => void, reject });
        worker.postMessage({ id, type, payload }, transfer ?? []);
      });
    },
    []
  );

  const init = useCallback(async () => {
    if (initializedRef.current) {
      setError(null);
      setStatus("ready");
      return;
    }

    setStatus("initializing");
    setError(null);
    try {
      await call("init");
      initializedRef.current = true;
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }, [call]);

  const setImage = useCallback(
    async (image: HTMLImageElement) => {
      setStatus("loadingImage");
      try {
        // Извлекаем ImageData один раз через offscreen canvas.
        // Замечание: изображение должно быть same-origin или с CORS, иначе getImageData кинет SecurityError.
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        if (!ctx) throw new Error("2d context unavailable");
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Перенос буфера в воркер — без копирования.
        await call(
          "setImage",
          {
            width: imageData.width,
            height: imageData.height,
            data: imageData.data.buffer,
          },
          [imageData.data.buffer]
        );
        setStatus("ready");
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    [call]
  );

  const buildMap = useCallback(
    async (seed: [number, number]) => {
      setStatus("building");
      try {
        await call("buildMap", { seed });
        setStatus("ready");
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    [call]
  );

  const getPath = useCallback(
    async (target: [number, number]): Promise<number[][]> => {
      const payload = (await call<{ flat: Int32Array }>("getPath", { target })) ?? {
        flat: new Int32Array(0),
      };
      const flat = payload.flat;
      const out: number[][] = new Array(flat.length / 2);
      for (let i = 0, j = 0; i < flat.length; i += 2, j++) {
        out[j] = [flat[i], flat[i + 1]];
      }
      return out;
    },
    [call]
  );

  return { status, error, init, setImage, buildMap, getPath };
}
