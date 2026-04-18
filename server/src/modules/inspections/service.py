from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from app.db import AsyncSessionLocal
from app.exception import NotFoundError, ValidationError
from constants import inspections as inspections_constants
from fastapi import UploadFile
from infra.ml.yolo_inspector import run_inference
from infra.queue.scheduler import (
    maybe_resume_paused_training,
    request_training_pause_for_inspection,
    schedule_inspection,
)
from infra.storage.file_storage import resolve_storage_path
from modules.groups.models import Group
from modules.ml_models.models import MlModel
from modules.segments.models import SegmentAnnotation, SegmentClass
from modules.standards.models import Standard, StandardImage
from modules.tasks.constants import (
    GPU_QUEUE,
    PRIORITY_INSPECTION,
    STATUS_FAILED,
    STATUS_RUNNING,
    STATUS_SUCCEEDED,
    TASK_INSPECTION,
)
from modules.tasks.models import Task
from modules.tasks.service import (
    create_task,
    update_task_progress,
    update_task_status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .matcher import (
    ExpectedItem,
    InferenceCounts,
    SegmentCheck,
    all_ok,
    build_expected_items,
    compare,
    summarize,
)
from .models import InspectionResult, InspectionSegmentResult

ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


@dataclass(slots=True)
class _InspectionContext:
    standard: Standard
    model: MlModel
    reference_image: StandardImage
    selected_classes: list[SegmentClass]


async def get_inspection(
    db: AsyncSession,
    *,
    inspection_id: UUID,
) -> InspectionResult:
    inspection = await db.get(InspectionResult, inspection_id)
    if not inspection:
        raise NotFoundError("Результат проверки", inspection_id)
    return inspection


async def save_inspection(
    db: AsyncSession,
    *,
    task_id: UUID,
    serial_number: str | None,
    notes: str | None,
) -> InspectionResult:
    task = await db.get(Task, task_id)
    if not task:
        raise NotFoundError("Задача", task_id)
    if task.status != STATUS_SUCCEEDED or not task.result:
        raise ValidationError("Задача еще не завершена или не содержит результата")

    data = task.result
    inspection = InspectionResult(
        standard_id=UUID(data["standard_id"]),
        model_id=UUID(data["model_id"]),
        camera_id=UUID(data["camera_id"]) if data.get("camera_id") else None,
        image_path=data["image_path"],
        result_image_path=None,
        status=data["inspection_status"],
        mode=data["mode"],
        total_segments=data["total"],
        matched_segments=data["matched"],
        serial_number=serial_number,
        notes=notes,
    )
    db.add(inspection)
    await db.flush()

    for detail in data["details"]:
        db.add(
            InspectionSegmentResult(
                inspection_id=inspection.id,
                segment_class_id=(
                    UUID(detail["segment_class_id"])
                    if detail.get("segment_class_id")
                    else None
                ),
                segment_class_group_id=(
                    UUID(detail["segment_class_group_id"])
                    if detail.get("segment_class_group_id")
                    else None
                ),
                class_key=detail["class_key"],
                name=detail["name"],
                is_found=detail["status"] == "ok",
                confidence=detail["confidence"],
                expected_count=detail["expected_count"],
                detected_count=detail["detected_count"],
                delta=detail["delta"],
                status=detail["status"],
            )
        )
    await db.commit()
    await db.refresh(inspection)
    return inspection


async def start_inspection(
    db: AsyncSession,
    *,
    standard_id: UUID,
    selected_segment_class_ids: list[UUID],
    camera_id: UUID | None,
    mode: str,
    serial_number: str | None,
    notes: str | None,
    image: UploadFile,
) -> Task:
    if mode not in inspections_constants.modes:
        raise ValidationError("Некорректный режим проверки")

    ctx = await _load_context(
        db,
        standard_id=standard_id,
        selected_segment_class_ids=selected_segment_class_ids,
    )

    await request_training_pause_for_inspection(db)

    task = await create_task(
        db,
        type=TASK_INSPECTION,
        status="pending",
        queue=GPU_QUEUE,
        priority=PRIORITY_INSPECTION,
        entity_type="standard",
        entity_id=ctx.standard.id,
        group_id=ctx.standard.group_id,
        payload=_build_inspection_payload(
            ctx=ctx,
            camera_id=camera_id,
            mode=mode,
            serial_number=serial_number,
            notes=notes,
            image=image,
            selected_segment_class_ids=selected_segment_class_ids,
        ),
    )

    image_path = await _persist_upload(image, task_id=task.id)
    task.payload = {**(task.payload or {}), "image_path": image_path}
    await db.commit()
    await db.refresh(task)

    return await schedule_inspection(db, task)


async def run_inspection_task(task_id: str) -> None:
    task_uuid = UUID(task_id)

    async with AsyncSessionLocal() as db:
        task = await db.get(Task, task_uuid)
        if task is None:
            return

        try:
            payload = task.payload or {}
            selected_ids = [
                UUID(cid) for cid in payload.get("selected_segment_class_ids", [])
            ]
            ctx = await _load_context(
                db,
                standard_id=UUID(payload["standard_id"]),
                selected_segment_class_ids=selected_ids,
            )

            await update_task_status(
                db,
                task_id=task_uuid,
                status=STATUS_RUNNING,
                stage="Инференс",
                message="Модель выполняет проверку",
            )

            expected = build_expected_items(
                ctx.reference_image, {c.id for c in ctx.selected_classes}
            )
            inference = await _run_inference(ctx, payload, expected)

            await update_task_progress(
                db,
                task_id=task_uuid,
                current=2,
                total=3,
                stage="Сравнение с эталоном",
            )

            checks = compare(expected, inference)
            total, matched, mismatched = summarize(checks)
            inspection_status = (
                inspections_constants.statuses.passed
                if all_ok(checks)
                else inspections_constants.statuses.failed
            )

            await update_task_status(
                db,
                task_id=task_uuid,
                status=STATUS_SUCCEEDED,
                stage="Готово",
                message="Проверка завершена",
                result=_build_result_payload(
                    ctx=ctx,
                    payload=payload,
                    checks=checks,
                    inspection_status=inspection_status,
                    total=total,
                    matched=matched,
                    mismatched=mismatched,
                ),
            )

        except Exception as exc:  # noqa: BLE001
            await update_task_status(
                db,
                task_id=task_uuid,
                status=STATUS_FAILED,
                stage="Ошибка",
                message="Проверка прервана из-за ошибки",
                error=str(exc),
            )

        finally:
            await maybe_resume_paused_training(db, exclude_inspection_task_id=task_uuid)


async def _load_context(
    db: AsyncSession,
    *,
    standard_id: UUID,
    selected_segment_class_ids: list[UUID],
) -> _InspectionContext:
    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images)
            .selectinload(StandardImage.annotations)
            .selectinload(SegmentAnnotation.segment_class),
            selectinload(Standard.group)
            .selectinload(Group.segment_classes)
            .selectinload(SegmentClass.class_group),
        )
        .where(Standard.id == standard_id)
    )
    standard = result.scalar_one_or_none()
    if standard is None:
        raise NotFoundError("Эталон", standard_id)

    reference_image = next((img for img in standard.images if img.is_reference), None)
    if reference_image is None:
        raise ValidationError("У эталона нет reference-фото")
    if not reference_image.annotations:
        raise ValidationError("Reference-фото не содержит аннотаций")

    selected_set = set(selected_segment_class_ids)
    selected_classes = [
        c for c in standard.group.segment_classes if c.id in selected_set
    ]
    if not selected_classes:
        raise ValidationError("Не выбраны классы для проверки")

    model = await _get_active_model(db, standard.group_id)
    return _InspectionContext(
        standard=standard,
        model=model,
        reference_image=reference_image,
        selected_classes=selected_classes,
    )


async def _get_active_model(db: AsyncSession, group_id: UUID) -> MlModel:
    result = await db.execute(
        select(MlModel).where(
            MlModel.group_id == group_id,
            MlModel.is_active.is_(True),
        )
    )
    model = result.scalar_one_or_none()
    if model is None:
        raise ValidationError("Для группы нет активной модели")
    if not model.weights_path:
        raise ValidationError("У активной модели нет пути к весам")
    if not resolve_storage_path(model.weights_path).exists():
        raise ValidationError(f"Файл весов не найден: {model.weights_path}")
    return model


async def _run_inference(
    ctx: _InspectionContext,
    payload: dict,
    expected: list[ExpectedItem],
) -> InferenceCounts:
    allowed_keys = {item.class_key for item in expected}
    raw = await asyncio.to_thread(
        run_inference,
        weights_path=resolve_storage_path(ctx.model.weights_path),
        image_path=resolve_storage_path(payload["image_path"]),
        imgsz=ctx.model.imgsz,
        allowed_class_keys=allowed_keys,
    )
    return InferenceCounts(
        counts=dict(raw.counts),
        raw_counts=dict(raw.raw_counts),
        avg_confidence=dict(raw.avg_confidence),
    )


async def _persist_upload(
    image: UploadFile,
    *,
    task_id: UUID,
) -> str:
    suffix = Path(image.filename).suffix.lower() if image.filename else ".jpg"
    if suffix not in ALLOWED_IMAGE_SUFFIXES:
        suffix = ".jpg"

    relative = f"inspections/source/{task_id}{suffix}"
    absolute = resolve_storage_path(relative)
    absolute.parent.mkdir(parents=True, exist_ok=True)
    absolute.write_bytes(await image.read())
    return relative


def _build_inspection_payload(
    *,
    ctx: _InspectionContext,
    camera_id: UUID | None,
    mode: str,
    serial_number: str | None,
    notes: str | None,
    image: UploadFile,
    selected_segment_class_ids: list[UUID],
) -> dict:
    return {
        "standard_id": str(ctx.standard.id),
        "group_id": str(ctx.standard.group_id),
        "camera_id": str(camera_id) if camera_id else None,
        "mode": mode,
        "serial_number": serial_number,
        "notes": notes,
        "filename": image.filename,
        "content_type": image.content_type,
        "model_id": str(ctx.model.id),
        "weights_path": ctx.model.weights_path,
        "imgsz": ctx.model.imgsz,
        "selected_segment_class_ids": [str(cid) for cid in selected_segment_class_ids],
    }


def _build_result_payload(
    *,
    ctx: _InspectionContext,
    payload: dict,
    checks: list[SegmentCheck],
    inspection_status: str,
    total: int,
    matched: int,
    mismatched: list[str],
) -> dict:
    return {
        "inspection_status": inspection_status,
        "matched": matched,
        "total": total,
        "missing": mismatched,
        "details": [_check_to_dict(c) for c in checks],
        "standard_id": str(ctx.standard.id),
        "model_id": str(ctx.model.id),
        "camera_id": payload.get("camera_id"),
        "mode": payload["mode"],
        "image_path": payload["image_path"],
    }


def _check_to_dict(c: SegmentCheck) -> dict:
    return {
        "segment_class_id": str(c.segment_class_id) if c.segment_class_id else None,
        "segment_class_group_id": str(c.segment_class_group_id)
        if c.segment_class_group_id
        else None,
        "class_key": c.class_key,
        "name": c.name,
        "status": c.status,
        "expected_count": c.expected_count,
        "detected_count": c.detected_count,
        "delta": c.delta,
        "confidence": c.confidence,
    }
