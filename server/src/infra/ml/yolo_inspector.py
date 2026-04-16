from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

from ultralytics import YOLO

_model_cache: dict[str, YOLO] = {}


@dataclass(slots=True)
class YoloDetection:
    class_name: str
    confidence: float
    bbox: dict[str, float]
    polygon: list[list[float]] | None = None


@dataclass(slots=True)
class YoloInferenceResult:
    detections: list[YoloDetection]
    counts: Counter[str]
    avg_confidence: dict[str, float | None]
    grouped_detections: dict[str, list[dict]]


def load_model(weights_path: Path) -> YOLO:
    key = str(weights_path.resolve())
    model = _model_cache.get(key)
    if model is None:
        model = YOLO(str(weights_path))
        _model_cache[key] = model
    return model


def run_inference(
    *,
    weights_path: Path,
    image_path: Path,
    imgsz: int = 640,
    conf: float = 0.25,
    iou: float = 0.5,
    allowed_class_names: set[str] | None = None,
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
    masks_xy = result.masks.xy if result.masks is not None else []

    detections: list[YoloDetection] = []
    counts: Counter[str] = Counter()
    confidence_map: dict[str, list[float]] = defaultdict(list)
    grouped_detections: dict[str, list[dict]] = defaultdict(list)

    if result.boxes is None:
        return YoloInferenceResult(
            detections=[],
            counts=Counter(),
            avg_confidence={},
            grouped_detections={},
        )

    for idx, box in enumerate(result.boxes):
        cls_idx = int(box.cls.item())
        class_name = str(names.get(cls_idx, str(cls_idx)))

        if allowed_class_names is not None and class_name not in allowed_class_names:
            continue

        confidence = float(box.conf.item())
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        polygon: list[list[float]] | None = None
        if idx < len(masks_xy):
            polygon = [[float(x), float(y)] for x, y in masks_xy[idx].tolist()]

        detection = YoloDetection(
            class_name=class_name,
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
        counts[class_name] += 1
        confidence_map[class_name].append(confidence)
        grouped_detections[class_name].append(
            {
                "confidence": round(confidence, 4),
                "bbox": detection.bbox,
                "polygon": polygon,
            }
        )

    avg_confidence = {
        class_name: round(sum(values) / len(values), 4) if values else None
        for class_name, values in confidence_map.items()
    }

    return YoloInferenceResult(
        detections=detections,
        counts=counts,
        avg_confidence=avg_confidence,
        grouped_detections=dict(grouped_detections),
    )
