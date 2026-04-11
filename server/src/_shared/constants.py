import json
import re
from pathlib import Path
from types import MappingProxyType
from typing import Any, Final


class _ConstNamespace:
    def __init__(self, **values: Any):
        for key, value in values.items():
            object.__setattr__(self, key, value)

    def __setattr__(self, name: str, value: Any) -> None:
        raise AttributeError("Constants are read-only")

    def __repr__(self) -> str:
        keys = ", ".join(sorted(self.__dict__))
        return f"{self.__class__.__name__}({keys})"


def _const(**values: Any) -> _ConstNamespace:
    return _ConstNamespace(**values)


def _sanitize_attr(value: str) -> str:
    return re.sub(r"\W|^(?=\d)", "_", value.lower())


def _choices(
    values: list[str] | tuple[str, ...],
    *,
    default: str | None = None,
    extra: dict[str, Any] | None = None,
) -> _ConstNamespace:
    items = {_sanitize_attr(value): value for value in values}
    items["all"] = tuple(values)
    if default is not None:
        items["default"] = default
    if extra:
        items.update(extra)
    return _const(**items)


CONSTANTS_PATH: Final[Path] = Path(__file__).resolve().parents[3] / "constants.json"

with CONSTANTS_PATH.open("r", encoding="utf-8") as f:
    RAW: Final[dict[str, Any]] = json.load(f)

_training_architectures = tuple(
    item["value"] for item in RAW["training"]["architectures"]
)
_training_base_weights = {
    item["value"]: item["baseWeights"] for item in RAW["training"]["architectures"]
}
_training_statuses = tuple(RAW["training"]["statuses"])

users: Final[_ConstNamespace] = _const(
    roles=_choices(
        RAW["users"]["roles"],
        default=RAW["users"]["defaults"]["role"],
    )
)

standards: Final[_ConstNamespace] = _const(
    angles=_choices(RAW["standards"]["angles"]),
)

inspections: Final[_ConstNamespace] = _const(
    statuses=_choices(
        RAW["inspections"]["statuses"],
        default=RAW["inspections"]["defaults"]["status"],
    ),
    modes=_choices(
        RAW["inspections"]["modes"],
        default=RAW["inspections"]["defaults"]["mode"],
    ),
)

training: Final[_ConstNamespace] = _const(
    statuses=_choices(
        _training_statuses,
        default=RAW["training"]["defaults"]["status"],
        extra={"active": tuple(RAW["training"]["activeStatuses"])},
    ),
    architecture=_choices(
        _training_architectures,
        default=RAW["training"]["defaults"]["architecture"],
        extra={"base_weights": MappingProxyType(_training_base_weights)},
    ),
    image_size=_const(
        all=tuple(RAW["training"]["imageSizes"]),
        default=RAW["training"]["defaults"]["imageSize"],
    ),
    epochs=_const(
        default=RAW["training"]["defaults"]["epochs"],
        min=RAW["training"]["limits"]["epochs"]["min"],
        max=RAW["training"]["limits"]["epochs"]["max"],
    ),
    batch_size=_const(
        default=RAW["training"]["defaults"]["batchSize"],
        min=RAW["training"]["limits"]["batchSize"]["min"],
        max=RAW["training"]["limits"]["batchSize"]["max"],
    ),
    train_ratio=_const(
        default=RAW["training"]["defaults"]["trainRatio"],
        min=RAW["training"]["limits"]["trainRatio"]["min"],
        max=RAW["training"]["limits"]["trainRatio"]["max"],
    ),
    val_ratio=_const(
        default=RAW["training"]["defaults"]["valRatio"],
        min=RAW["training"]["limits"]["valRatio"]["min"],
        max=RAW["training"]["limits"]["valRatio"]["max"],
    ),
    split=_const(
        ratio_sum_max=RAW["training"]["limits"]["ratioSumMax"],
        min_images_to_train=RAW["training"]["limits"]["minImagesToTrain"],
    ),
)

segments: Final[_ConstNamespace] = _const(
    hue=_const(
        default=RAW["segments"]["hue"]["default"],
        min=RAW["segments"]["hue"]["min"],
        max=RAW["segments"]["hue"]["max"],
    )
)

uploads: Final[_ConstNamespace] = _const(
    allowed_types=frozenset(RAW["uploads"]["allowedTypes"]),
    max_size_bytes=RAW["uploads"]["maxSizeBytes"],
)

__all__ = [
    "users",
    "standards",
    "inspections",
    "training",
    "segments",
    "uploads",
]
