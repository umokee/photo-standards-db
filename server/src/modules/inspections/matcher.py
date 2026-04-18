from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from modules.segments.models import SegmentAnnotation
from modules.standards.models import StandardImage


@dataclass(slots=True)
class ExpectedItem:
    segment_class_id: UUID
    segment_class_group_id: UUID | None
    class_key: str
    name: str
    hue: int | None
    expected_count: int


@dataclass(slots=True)
class InferenceCounts:
    counts: dict[str, int]
    raw_counts: dict[str, int]
    avg_confidence: dict[str, float]


@dataclass(slots=True)
class SegmentCheck:
    segment_class_id: UUID | None
    segment_class_group_id: UUID | None
    class_key: str
    name: str
    status: str  # "ok" | "less" | "more" | "extra"
    expected_count: int
    detected_count: int
    delta: int
    confidence: float | None


def build_expected_items(
    reference_image: StandardImage,
    selected_class_ids: set[UUID],
) -> list[ExpectedItem]:
    grouped: dict[UUID, list[SegmentAnnotation]] = {}
    for ann in reference_image.annotations:
        if ann.segment_class_id is None or ann.segment_class is None:
            continue
        if ann.segment_class_id not in selected_class_ids:
            continue
        grouped.setdefault(ann.segment_class_id, []).append(ann)

    items: list[ExpectedItem] = []
    for anns in grouped.values():
        sc = anns[0].segment_class
        items.append(
            ExpectedItem(
                segment_class_id=sc.id,
                segment_class_group_id=sc.class_group_id,
                class_key=sc.key,
                name=sc.name,
                hue=sc.hue,
                expected_count=len(anns),
            )
        )
    return items


def compare(
    expected: list[ExpectedItem], inference: InferenceCounts
) -> list[SegmentCheck]:
    checks = [_check_expected(item, inference) for item in expected]
    expected_keys = {item.class_key for item in expected}
    checks.extend(_extra_detections(inference, expected_keys))
    return checks


def summarize(checks: list[SegmentCheck]) -> tuple[int, int, list[str]]:
    total = len(checks)
    matched = sum(1 for c in checks if c.status == "ok")
    mismatched_names = [c.name for c in checks if c.status != "ok"]
    return total, matched, mismatched_names


def all_ok(checks: list[SegmentCheck]) -> bool:
    return all(c.status == "ok" for c in checks)


def _check_expected(item: ExpectedItem, inference: InferenceCounts) -> SegmentCheck:
    detected = int(inference.counts.get(item.class_key, 0))
    delta = detected - item.expected_count
    if delta == 0:
        status = "ok"
    elif delta < 0:
        status = "less"
    else:
        status = "more"
    return SegmentCheck(
        segment_class_id=item.segment_class_id,
        segment_class_group_id=item.segment_class_group_id,
        class_key=item.class_key,
        name=item.name,
        status=status,
        expected_count=item.expected_count,
        detected_count=detected,
        delta=delta,
        confidence=inference.avg_confidence.get(item.class_key),
    )


def _extra_detections(
    inference: InferenceCounts, expected_keys: set[str]
) -> list[SegmentCheck]:
    extras: list[SegmentCheck] = []
    for key, count in inference.raw_counts.items():
        if key in expected_keys or count <= 0:
            continue
        extras.append(
            SegmentCheck(
                segment_class_id=None,
                segment_class_group_id=None,
                class_key=key,
                name=key,
                status="extra",
                expected_count=0,
                detected_count=int(count),
                delta=int(count),
                confidence=inference.avg_confidence.get(key),
            )
        )
    return extras
