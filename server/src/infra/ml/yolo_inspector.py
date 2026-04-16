from __future__ import annotations

import logging
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from ultralytics import YOLO

logger = logging.getLogger(__name__)

_model_cache: dict[str, tuple[float, YOLO]] = {}


@dataclass(slots=True)
class YoloDetection:
    class_key: str
    confidence: float
    bbox: dict[str, float]
    polygon: list[list[float]] | None = None


@dataclass(slots=True)
class YoloInferenceResult:
    detections: list[YoloDetection]
    counts: Counter[str]
    avg_confidence: dict[str, float | None]
    grouped_detections: dict[str, list[dict]]
    model_class_keys: list[str] = field(default_factory=list)
    raw_counts: Counter[str] = field(default_factory=Counter)


def load_model(weights_path: Path) -> YOLO:
    key = str(weights_path.resolve())
    mtime = weights_path.stat().st_mtime

    cached = _model_cache.get(key)
    if cached is not None and cached[0] == mtime:
        return cached[1]

    model = YOLO(str(weights_path))
    _model_cache[key] = (mtime, model)
    return model


def run_inference(
    *,
    weights_path: Path,
    image_path: Path,
    imgsz: int = 640,
    conf: float = 0.25,
    iou: float = 0.5,
    allowed_class_keys: set[str] | None = None,
) -> YoloInferenceResult:
    model = load_model(weights_path)

    results = model.predict(
        source=str(image_path),
        imgsz=imgsz,
        conf=conf,
        iou=iou,
        verbose=False,
        save=False,
    )

    if not results:
        return YoloInferenceResult(
            detections=[],
            counts=Counter(),
            avg_confidence={},
            grouped_detections={},
        )

    result = results[0]
    names = result.names or {}
    model_class_keys = [str(names(k)) for k in sorted(names)]
    masks_xy = result.masks.xy if result.masks is not None else []

    detections: list[YoloDetection] = []
    counts: Counter[str] = Counter()
    confidence_map: dict[str, list[float]] = defaultdict(list)
    grouped_detections: dict[str, list[dict]] = defaultdict(list)

    if result.boxes is None:
        logger.info(
            "yolo.inspect no_boxes image=%s model_classes=%s",
            image_path,
            model_class_keys,
        )
        return YoloInferenceResult(
            detections=[],
            counts=Counter(),
            avg_confidence={},
            grouped_detections={},
            model_class_keys=model_class_keys,
        )

    detections: list[YoloDetection] = []
    counts: Counter[str] = Counter()
    raw_counts: Counter[str] = Counter()
    confidence_map: dict[str, list[float]] = defaultdict(list)
    grouped_detections: dict[str, list[dict]] = defaultdict(list)

    for idx, box in enumerate(result.boxes):
        cls_idx = int(box.cls.item())
        class_key = str(names.get(cls_idx, str(cls_idx)))
        confidence = float(box.conf.item())
        raw_counts[class_key] += 1

        if allowed_class_keys is not None and class_key not in allowed_class_keys:
            continue

        x1, y1, x2, y2 = box.xyxy[0].tolist()

        polygon: list[list[float]] | None = None
        if idx < len(masks_xy):
            polygon = [[float(x), float(y)] for x, y in masks_xy[idx].tolist()]

        detection = YoloDetection(
            class_key=class_key,
            confidence=confidence,
            bbox={
                "x": round(float(x1), 2),
                "y": round(float(y1), 2),
                "w": round(float(max(x2 - x1, 0.0)), 2),
                "h": round(float(max(y2 - y1, 0.0)), 2),
            },
            polygon=polygon,
        )
        detections.append(detection)
        counts[class_key] += 1
        confidence_map[class_key].append(confidence)
        grouped_detections[class_key].append(
            {
                "confidence": round(confidence, 4),
                "bbox": detection.bbox,
                "polygon": polygon,
            }
        )

    avg_confidence = {
        class_key: round(sum(values) / len(values), 4) if values else None
        for class_key, values in confidence_map.items()
    }

    logger.info(
        "yolo.inspect image=%s conf=%s imgsz=%s model_classes=%s raw=%s filtered=%s",
        image_path,
        conf,
        imgsz,
        model_class_keys,
        dict(raw_counts),
        dict(counts),
    )

    return YoloInferenceResult(
        detections=detections,
        counts=counts,
        avg_confidence=avg_confidence,
        grouped_detections=dict(grouped_detections),
        model_class_keys=model_class_keys,
        raw_counts=raw_counts,
    )
