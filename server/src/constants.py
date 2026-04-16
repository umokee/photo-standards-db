from __future__ import annotations

from collections.abc import Iterator
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

ValueT = TypeVar("ValueT")


class ConstModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        frozen=True,
    )


class ValuesCollection(ConstModel, Generic[ValueT]):
    values: tuple[ValueT, ...]

    def __iter__(self) -> Iterator[ValueT]:
        return iter(self.values)

    def __contains__(self, item: object) -> bool:
        return item in self.values

    def __len__(self) -> int:
        return len(self.values)

    def __getitem__(self, index: int) -> ValueT:
        return self.values[index]


class ValuesWithDefault(ValuesCollection[str]):
    default: str


class ValuesOnly(ValuesCollection[str]):
    pass


class IntValuesWithDefault(ValuesCollection[int]):
    default: int


class IntRange(ConstModel):
    default: int
    min: int
    max: int


class TrainingArchitectures(ValuesCollection[str]):
    default: str
    base_weights: dict[str, str]


class TrainingStatuses(ValuesCollection[str]):
    active: tuple[str, ...]
    default: str


class TrainingConstants(ConstModel):
    statuses: TrainingStatuses
    architectures: TrainingArchitectures
    image_size: IntValuesWithDefault
    epochs: IntRange
    batch_size: IntRange
    train_ratio: IntRange
    val_ratio: IntRange
    ratio_sum_max: int
    min_images_to_train: int


class UsersConstants(ConstModel):
    roles: ValuesWithDefault


class StandardsConstants(ConstModel):
    angles: ValuesOnly


class InspectionConstants(ConstModel):
    statuses: ValuesWithDefault
    modes: ValuesWithDefault


class HueConstants(ConstModel):
    default: int
    min: int
    max: int


class SegmentsConstants(ConstModel):
    hue: HueConstants


class UploadAllowedTypes(ValuesCollection[str]):
    pass


class UploadsConstants(ConstModel):
    allowed_types: UploadAllowedTypes
    max_size_bytes: int


class AppConstants(ConstModel):
    users: UsersConstants
    standards: StandardsConstants
    inspections: InspectionConstants
    training: TrainingConstants
    segments: SegmentsConstants
    uploads: UploadsConstants


constants = AppConstants(
    users=UsersConstants(
        roles=ValuesWithDefault(
            values=("operator", "admin"),
            default="operator",
        )
    ),
    standards=StandardsConstants(
        angles=ValuesOnly(
            values=("front", "top", "left", "right", "back"),
        )
    ),
    inspections=InspectionConstants(
        statuses=ValuesWithDefault(
            values=("passed", "failed"),
            default="passed",
        ),
        modes=ValuesWithDefault(
            values=("photo", "snapshot", "realtime"),
            default="photo",
        ),
    ),
    training=TrainingConstants(
        statuses=TrainingStatuses(
            values=("pending", "preparing", "training", "saving", "done", "failed"),
            active=("pending", "preparing", "training", "saving"),
            default="pending",
        ),
        architectures=TrainingArchitectures(
            values=(
                "yolov26n-seg",
                "yolov26s-seg",
                "yolov26m-seg",
                "yolov26l-seg",
                "yolov26x-seg",
            ),
            default="yolov26n-seg",
            base_weights={
                "yolov26n-seg": "yolo26n-seg.pt",
                "yolov26s-seg": "yolo26s-seg.pt",
                "yolov26m-seg": "yolo26m-seg.pt",
                "yolov26l-seg": "yolo26l-seg.pt",
                "yolov26x-seg": "yolo26x-seg.pt",
            },
        ),
        image_size=IntValuesWithDefault(
            values=(320, 416, 512, 640, 768, 1024, 1280),
            default=640,
        ),
        epochs=IntRange(default=100, min=1, max=1000),
        batch_size=IntRange(default=16, min=1, max=256),
        train_ratio=IntRange(default=80, min=60, max=80),
        val_ratio=IntRange(default=10, min=10, max=20),
        ratio_sum_max=100,
        min_images_to_train=3,
    ),
    segments=SegmentsConstants(
        hue=HueConstants(default=210, min=0, max=359),
    ),
    uploads=UploadsConstants(
        allowed_types=UploadAllowedTypes(
            values=("image/jpeg", "image/png", "image/jpg"),
        ),
        max_size_bytes=20971520,
    ),
)

users: UsersConstants = constants.users
standards: StandardsConstants = constants.standards
inspections: InspectionConstants = constants.inspections
training: TrainingConstants = constants.training
segments: SegmentsConstants = constants.segments
uploads: UploadsConstants = constants.uploads

__all__ = [
    "AppConstants",
    "InspectionConstants",
    "SegmentsConstants",
    "StandardsConstants",
    "TrainingConstants",
    "UploadsConstants",
    "UsersConstants",
    "constants",
    "inspections",
    "segments",
    "standards",
    "training",
    "uploads",
    "users",
]
