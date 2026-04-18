/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

// Classic worker (no `type: 'module'`) — используем importScripts для opencv.js.
// opencv.js должен быть в client/public/opencv.js (см. README в /public).

declare const cv: any;

// Module.onRuntimeInitialized должен быть определён ДО importScripts.
let cvReadyResolve: () => void = () => {};
const cvReady = new Promise<void>((resolve) => {
  cvReadyResolve = resolve;
});

(self as any).Module = {
  onRuntimeInitialized: () => cvReadyResolve(),
};

self.importScripts("/opencv.js");

// ── состояние воркера ──────────────────────────────────────────────

let scissors: any = null;
let imageMat: any = null;

// ── протокол сообщений ─────────────────────────────────────────────

type Req =
  | { id: number; type: "init" }
  | {
      id: number;
      type: "setImage";
      payload: { width: number; height: number; data: ArrayBuffer };
    }
  | { id: number; type: "buildMap"; payload: { seed: [number, number] } }
  | { id: number; type: "getPath"; payload: { target: [number, number] } }
  | { id: number; type: "dispose" };

type Ok<T = undefined> = T extends undefined
  ? { id: number; type: "ok" }
  : { id: number; type: "ok"; payload: T };

type Err = { id: number; type: "error"; payload: string };

const ok = (id: number, payload?: unknown): Ok | Ok<unknown> =>
  payload === undefined ? { id, type: "ok" } : { id, type: "ok", payload };

const err = (id: number, message: string): Err => ({ id, type: "error", payload: message });

// ── handlers ───────────────────────────────────────────────────────

async function handleInit(id: number) {
  await cvReady;

  if (!scissors) {
    scissors = new cv.segmentation_IntelligentScissorsMB();
    // Параметры подобраны для заводских снимков с умеренным контрастом.
    // При необходимости вынести в конфиг.
    scissors.setEdgeFeatureCannyParameters(32, 100);
    scissors.setGradientMagnitudeMaxLimit(200);
  }

  self.postMessage(ok(id));
}

function handleSetImage(id: number, width: number, height: number, data: ArrayBuffer) {
  if (!scissors) throw new Error("scissors engine is not initialized");

  if (imageMat) {
    imageMat.delete();
    imageMat = null;
  }

  // Uint8ClampedArray поверх переданного буфера — без копирования.
  const bytes = new Uint8ClampedArray(data);
  imageMat = cv.matFromImageData({ width, height, data: bytes } as ImageData);
  scissors.applyImage(imageMat);

  self.postMessage(ok(id));
}

function handleBuildMap(id: number, seed: [number, number]) {
  if (!scissors) throw new Error("scissors engine is not initialized");

  const [x, y] = seed;
  scissors.buildMap(new cv.Point(x, y));

  self.postMessage(ok(id));
}

function handleGetPath(id: number, target: [number, number]) {
  if (!scissors) throw new Error("scissors engine is not initialized");

  const out = new cv.Mat();
  try {
    scissors.getContour(new cv.Point(target[0], target[1]), out, false);

    // CV_32SC2 → плоский Int32Array длины 2*N
    const n = out.rows;
    const flat = new Int32Array(n * 2);
    for (let i = 0; i < n; i++) {
      flat[i * 2] = out.intAt(i, 0);
      flat[i * 2 + 1] = out.intAt(i, 1);
    }

    self.postMessage(
      { id, type: "ok", payload: { flat } },
      // transfer: перенос буфера без копирования
      [flat.buffer]
    );
  } finally {
    out.delete();
  }
}

function handleDispose(id: number) {
  if (scissors) {
    scissors.delete();
    scissors = null;
  }
  if (imageMat) {
    imageMat.delete();
    imageMat = null;
  }
  self.postMessage(ok(id));
}

// ── диспетчер ──────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<Req>) => {
  const msg = e.data;

  try {
    switch (msg.type) {
      case "init":
        await handleInit(msg.id);
        break;
      case "setImage":
        handleSetImage(msg.id, msg.payload.width, msg.payload.height, msg.payload.data);
        break;
      case "buildMap":
        handleBuildMap(msg.id, msg.payload.seed);
        break;
      case "getPath":
        handleGetPath(msg.id, msg.payload.target);
        break;
      case "dispose":
        handleDispose(msg.id);
        break;
    }
  } catch (e) {
    self.postMessage(err(msg.id, e instanceof Error ? e.message : String(e)));
  }
};
