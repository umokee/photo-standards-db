from pathlib import Path

from config import STORAGE_PATH


LEGACY_WEIGHT_NAME_MAP = {
    "yolov26n-seg.pt": "yolo26n-seg.pt",
    "yolov26s-seg.pt": "yolo26s-seg.pt",
    "yolov26m-seg.pt": "yolo26m-seg.pt",
    "yolov26l-seg.pt": "yolo26l-seg.pt",
    "yolov26x-seg.pt": "yolo26x-seg.pt",
}


def canonicalize_weights_path(weights_path: str) -> str:
    path = Path(weights_path)
    normalized_name = LEGACY_WEIGHT_NAME_MAP.get(path.name, path.name)

    if path.is_absolute():
        parts = list(path.parts)
        if "storage" in parts:
            storage_index = parts.index("storage")
            relative_parts = parts[storage_index + 1 : -1]
            relative_path = Path(*relative_parts) / normalized_name
            return str(relative_path)
        return str(path.with_name(normalized_name))

    return str(path.with_name(normalized_name))


def resolve_weights_path(weights_path: str) -> Path:
    canonical_path = Path(canonicalize_weights_path(weights_path))
    if canonical_path.is_absolute():
        return canonical_path
    return STORAGE_PATH / canonical_path
