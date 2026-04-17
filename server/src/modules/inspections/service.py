from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from app.config import settings
from app.exception import ConflictError, NotFoundError, ValidationError
from constants import inspections
from fastapi import UploadFile
from modules.groups.models import Group
from modules.inspections.models import InspectionResult, InspectionSegmentResult
from modules.ml_models.models import MlModel
from modules.segments.models import SegmentAnnotation, SegmentClass
from modules.standards.models import Standard, StandardImage
from modules.tasks.models import Task
from modules.tasks.service import create_task, update_task_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


@dataclass(slots=True)
class InspectionContext:
    standard: Standard
    reference_image: StandardImage
    selected_segment_classes: list[SegmentClass]
    annotation_by_class_id: dict[UUID, SegmentAnnotation]
    model: MlModel


# -------- getters --------


async def get_inspection(
    db: AsyncSession,
    inspection_id: UUID,
) -> InspectionResult:
    inspection = await db.get(InspectionResult, inspection_id)
    if not inspection:
        raise NotFoundError("Проверка", inspection_id)
    return inspection


async def load_inspection_context(
    db: AsyncSession,
    *,
    standard_id: UUID,
    selected_segment_class_ids: list[UUID],
) -> InspectionContext:
    """
    Валидация всех предпосылок для проверки, до постановки задачи в очередь.
    Именно здесь отлавливаем "модель не знает этих классов", чтобы не гонять
    воркер ради ошибки.
    """
    if not selected_segment_class_ids:
        raise ValidationError("Нужно выбрать хотя бы один класс для проверки")

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
    if not standard:
        raise NotFoundError("Эталон", standard_id)

    reference_image = next((img for img in standard.images if img.is_reference), None)
    if not reference_image:
        raise ValidationError("У эталона нет reference-изображения")

    annotation_by_class_id = {
        ann.segment_class_id: ann
        for ann in reference_image.annotations
        if ann.points and ann.segment_class_id is not None
    }

    classes_by_id = {
        segment_class.id: segment_class
        for segment_class in standard.group.segment_classes
    }
    missing_class_ids = [
        class_id
        for class_id in selected_segment_class_ids
        if class_id not in classes_by_id
    ]
    if missing_class_ids:
        raise ValidationError("Часть выбранных классов не принадлежит группе эталона")

    selected_segment_classes = [
        classes_by_id[class_id] for class_id in selected_segment_class_ids
    ]

    result = await db.execute(
        select(MlModel)
        .where(
            MlModel.group_id == standard.group_id,
            MlModel.is_active.is_(True),
        )
        .limit(1)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise ValidationError("Для группы нет активной модели")
    if not model.weights_path:
        raise ValidationError("У активной модели отсутствует путь к весам")

    model_class_keys = set(model.class_keys or [])
    unknown = [
        cls.name
        for cls in selected_segment_classes
        if str(cls.id) not in model_class_keys
    ]
    if unknown:
        raise ValidationError(
            "Активная модель не обучена на классах: "
            f"{', '.join(sorted(unknown))}. Переобучите модель."
        )

    return InspectionContext(
        standard=standard,
        reference_image=reference_image,
        selected_segment_classes=selected_segment_classes,
        annotation_by_class_id=annotation_by_class_id,
        model=model,
    )


# -------- expected items (pure) --------


def build_expected_items(
    *,
    segment_classes: list[SegmentClass],
    annotation_by_class_id: dict[UUID, SegmentAnnotation],
) -> list[dict]:
    """
    Для каждого выбранного класса считаем, сколько инстансов мы ждём на кадре,
    исходя из разметки reference-изображения _этого эталона_.

    expected_count = число полигонов в SegmentAnnotation.points (list[list[[x,y]]]).
    Если класс выбран, но у него нет аннотации на reference — ждём 0 (класс на этом
    ракурсе не виден и его не должно быть).

    class_key = str(segment_class.id) — стабильный ML-ключ, именно этим именем
    модель училась, именно его YOLO вернёт в class_name на инференсе.
    """
    items: list[dict] = []

    for cls in segment_classes:
        annotation = annotation_by_class_id.get(cls.id)
        expected_count = (
            len(annotation.points) if annotation and annotation.points else 0
        )

        items.append(
            {
                "segment_class_id": cls.id,
                "segment_class_group_id": cls.class_group_id,
                "class_key": str(cls.id),
                "name": cls.name,
                "hue": cls.hue,
                "expected_count": expected_count,
            }
        )

    return items


# -------- start --------


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
    if mode not in inspections.modes:
        raise ValidationError("Некорректный режим проверки")

    context = await load_inspection_context(
        db,
        standard_id=standard_id,
        selected_segment_class_ids=selected_segment_class_ids,
    )

    from modules.tasks.service import request_training_pause_for_inspection

    await request_training_pause_for_inspection(
        db,
        message="Обучение приостановлено ради приоритетной проверки",
    )

    suffix = Path(image.filename).suffix.lower() if image.filename else ".jpg"
    if suffix not in ALLOWED_IMAGE_SUFFIXES:
        suffix = ".jpg"

    task = await create_task(
        db,
        type="inspection_run",
        status="pending",
        queue="gpu",
        priority=100,
        entity_type="standard",
        entity_id=context.standard.id,
        group_id=context.standard.group_id,
        payload={
            "standard_id": str(context.standard.id),
            "group_id": str(context.standard.group_id),
            "camera_id": str(camera_id) if camera_id else None,
            "mode": mode,
            "serial_number": serial_number,
            "notes": notes,
            "filename": image.filename,
            "content_type": image.content_type,
            "model_id": str(context.model.id),
            "weights_path": context.model.weights_path,
            "imgsz": context.model.imgsz,
            "selected_segment_class_ids": [
                str(class_id) for class_id in selected_segment_class_ids
            ],
        },
    )

    relative_path = f"inspections/source/{task.id}{suffix}"
    absolute_path = settings.STORAGE_ROOT / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(await image.read())

    task.payload = {**(task.payload or {}), "image_path": relative_path}
    await db.commit()
    await db.refresh(task)

    from .jobs import execute_inspection

    job = await execute_inspection.configure(
        queue="gpu",
        priority=100,
    ).defer_async(task_id=str(task.id))

    return await update_task_status(
        db,
        task_id=task.id,
        status="queued",
        stage="В очереди",
        message="Проверка поставлена в GPU-очередь",
        external_job_id=str(job.id),
    )


# -------- persist result --------


async def save_inspection_result(
    db: AsyncSession,
    *,
    task_id: UUID,
    serial_number: str | None,
    notes: str | None,
) -> InspectionResult:
    """
    Переносит результат из Task.result в постоянную таблицу inspection_results.
    Идемпотентно: повторный вызов для уже сохранённой задачи вернёт ту же запись.
    """
    task = await db.get(Task, task_id)
    if not task:
        raise NotFoundError("Задача", task_id)

    if task.type != "inspection_run":
        raise ValidationError("Указанная задача не относится к проверке")
    if task.status != "succeeded":
        raise ConflictError("Сначала дождитесь завершения проверки")

    payload = task.payload or {}
    result = task.result or {}

    existing_inspection_id = result.get("inspection_id")
    if existing_inspection_id:
        inspection = await db.get(InspectionResult, UUID(str(existing_inspection_id)))
        if inspection:
            return inspection
        raise ConflictError("Результат уже был сохранён, но запись не найдена")

    standard_id = payload.get("standard_id")
    model_id = payload.get("model_id")
    camera_id = payload.get("camera_id")
    image_path = payload.get("image_path")
    mode = result.get("mode") or payload.get("mode")
    status = result.get("status")
    total = result.get("total")
    matched = result.get("matched")
    details = result.get("details")

    if not standard_id or not image_path or not mode or not status:
        raise ValidationError("В задаче отсутствуют данные для сохранения результата")
    if not isinstance(total, int) or not isinstance(matched, int):
        raise ValidationError("В задаче отсутствует итоговая статистика проверки")
    if not isinstance(details, list):
        raise ValidationError(
            "В задаче отсутствуют детализированные результаты проверки"
        )

    inspection = InspectionResult(
        standard_id=UUID(str(standard_id)),
        model_id=UUID(str(model_id)) if model_id else None,
        camera_id=UUID(str(camera_id)) if camera_id else None,
        user_id=task.created_by_id,
        image_path=str(image_path),
        result_image_path=None,
        status=str(status),
        mode=str(mode),
        total_segments=total,
        matched_segments=matched,
        serial_number=serial_number,
        notes=notes,
    )
    db.add(inspection)
    await db.flush()

    for item in details:
        if not isinstance(item, dict):
            continue

        segment_class_id_raw = item.get("segment_class_id")
        segment_class_group_id_raw = item.get("segment_class_group_id")
        confidence = item.get("confidence")
        expected_count = item.get("expected_count")
        detected_count = item.get("detected_count")
        delta = item.get("delta")
        item_status = str(item.get("status") or "")
        # is_found = "хотя бы одна деталь этого класса найдена",
        # в отличие от status == "ok" (= ровно столько, сколько ждали).
        is_found = isinstance(detected_count, int) and detected_count > 0

        db.add(
            InspectionSegmentResult(
                inspection_id=inspection.id,
                segment_class_id=UUID(str(segment_class_id_raw))
                if segment_class_id_raw
                else None,
                segment_class_group_id=UUID(str(segment_class_group_id_raw))
                if segment_class_group_id_raw
                else None,
                class_key=str(item.get("class_key") or ""),
                name=str(item.get("name") or ""),
                is_found=is_found,
                confidence=float(confidence) if confidence is not None else None,
                expected_count=int(expected_count)
                if expected_count is not None
                else None,
                detected_count=int(detected_count)
                if detected_count is not None
                else None,
                delta=int(delta) if delta is not None else None,
                status=item_status,
            )
        )

    task.result = {**result, "inspection_id": str(inspection.id)}

    await db.commit()
    await db.refresh(inspection)
    return inspection
