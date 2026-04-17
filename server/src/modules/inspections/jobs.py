from __future__ import annotations

import logging
from uuid import UUID

from app.db import get_sync_session
from app.import_models import import_models
from infra.ml.yolo_inspector import run_inference
from infra.queue.procrastinate import app
from infra.storage.file_storage import resolve_storage_path
from modules.groups.models import Group
from modules.ml_models.models import MlModel
from modules.segments.models import SegmentAnnotation, SegmentClass
from modules.standards.models import Standard, StandardImage
from modules.tasks.models import Task
from modules.tasks.service_sync import (
    get_task_sync,
    is_task_cancelled_sync,
    set_task_progress_sync,
    set_task_state_sync,
)
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .service import build_expected_items

import_models()

logger = logging.getLogger(__name__)


def _load_standard(db: Session, standard_id: UUID) -> Standard | None:
    result = db.execute(
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
    return result.scalar_one_or_none()


def _select_reference_image(standard: Standard) -> StandardImage | None:
    return next((img for img in standard.images if img.is_reference), None)


def _build_annotation_by_class_id(
    reference_image: StandardImage,
) -> dict[UUID, SegmentAnnotation]:
    return {
        ann.segment_class_id: ann
        for ann in reference_image.annotations
        if ann.points and ann.segment_class_id is not None
    }


@app.task(queue="gpu")
def execute_inspection(*, task_id: str) -> None:
    tid = UUID(task_id)

    with get_sync_session() as db:
        task = get_task_sync(db, tid)
        if not task:
            return
        if task.status == "cancelled":
            return

        try:
            _run_inspection_job(db, task)
        except Exception as exc:
            logger.exception("inspection task=%s failed", task.id)
            db.rollback()
            current = get_task_sync(db, tid)
            if current is not None and current.status != "cancelled":
                set_task_state_sync(
                    db,
                    current,
                    status="failed",
                    stage="Ошибка",
                    message="Проверка прервана из-за ошибки",
                    error=str(exc),
                )
        finally:
            final_task = get_task_sync(db, tid)
            if final_task is not None and final_task.status in {
                "succeeded",
                "failed",
                "cancelled",
            }:
                from modules.tasks.service_sync import maybe_resume_paused_training_sync

                maybe_resume_paused_training_sync(
                    db,
                    exclude_inspection_task_id=final_task.id,
                )


def _run_inspection_job(db: Session, task: Task) -> None:
    payload = task.payload or {}
    try:
        standard_id = UUID(payload["standard_id"])
        model_id = UUID(payload["model_id"])
        selected_segment_class_ids = [
            UUID(item) for item in payload["selected_segment_class_ids"]
        ]
    except (KeyError, ValueError, TypeError) as exc:
        set_task_state_sync(
            db,
            task,
            status="failed",
            stage="Ошибка",
            error=f"Некорректный payload задачи: {exc}",
        )
        return

    mode = payload.get("mode")
    image_rel = payload.get("image_path")
    if not image_rel:
        set_task_state_sync(
            db,
            task,
            status="failed",
            stage="Ошибка",
            error="В задаче отсутствует путь к изображению",
        )
        return

    # --- подготовка эталона ---

    set_task_state_sync(
        db,
        task,
        status="running",
        stage="Подготовка",
        message="Подготовка контекста проверки",
    )
    set_task_progress_sync(db, task, current=1, total=3, stage="Подготовка эталона")

    standard = _load_standard(db, standard_id)
    if standard is None:
        set_task_state_sync(
            db,
            task,
            status="failed",
            stage="Ошибка",
            error="Эталон не найден",
        )
        return

    reference_image = _select_reference_image(standard)
    if reference_image is None:
        set_task_state_sync(
            db,
            task,
            status="failed",
            stage="Ошибка",
            error="У эталона нет reference-изображения",
        )
        return

    model = db.get(MlModel, model_id)
    if model is None:
        set_task_state_sync(
            db,
            task,
            status="failed",
            stage="Ошибка",
            error="Модель не найдена",
        )
        return
    if not model.weights_path:
        set_task_state_sync(
            db,
            task,
            status="failed",
            stage="Ошибка",
            error="У активной модели отсутствует путь к весам",
        )
        return

    classes_by_id = {cls.id: cls for cls in standard.group.segment_classes}
    try:
        selected_segment_classes = [
            classes_by_id[class_id] for class_id in selected_segment_class_ids
        ]
    except KeyError:
        set_task_state_sync(
            db,
            task,
            status="failed",
            stage="Ошибка",
            error="Выбранный класс не принадлежит группе эталона",
        )
        return

    annotation_by_class_id = _build_annotation_by_class_id(reference_image)
    expected_items = build_expected_items(
        segment_classes=selected_segment_classes,
        annotation_by_class_id=annotation_by_class_id,
    )
    allowed_class_keys = {item["class_key"] for item in expected_items}

    if is_task_cancelled_sync(db, task):
        return

    # --- инференс ---

    set_task_progress_sync(
        db,
        task,
        current=2,
        total=3,
        stage="Инференс",
        message="Выполняется анализ изображения",
    )

    inference = run_inference(
        weights_path=resolve_storage_path(model.weights_path),
        image_path=resolve_storage_path(image_rel),
        imgsz=model.imgsz,
        allowed_class_keys=allowed_class_keys,
    )

    if is_task_cancelled_sync(db, task):
        return

    # --- сравнение ---

    set_task_progress_sync(
        db,
        task,
        current=3,
        total=3,
        stage="Сравнение с эталоном",
    )

    expected_keys = {item["class_key"] for item in expected_items}
    details: list[dict] = []
    mismatched: list[str] = []

    # Ожидаемые классы: для каждого считаем ok / less / more
    for item in expected_items:
        key = item["class_key"]
        expected_count = item["expected_count"]
        detected_count = int(inference.counts.get(key, 0))
        delta = detected_count - expected_count

        if delta == 0:
            item_status = "ok"
        elif delta < 0:
            item_status = "less"
        else:
            item_status = "more"

        if item_status != "ok":
            mismatched.append(item["name"])

        details.append(
            {
                "segment_class_id": str(item["segment_class_id"]),
                "segment_class_group_id": str(item["segment_class_group_id"])
                if item["segment_class_group_id"]
                else None,
                "class_key": key,
                "name": item["name"],
                "hue": item["hue"],
                "expected_count": expected_count,
                "detected_count": detected_count,
                "delta": delta,
                "status": item_status,
                "confidence": inference.avg_confidence.get(key),
                "detections": inference.grouped_detections.get(key, []),
            }
        )

    # Лишние классы: детектировано что-то, чего мы не ждали.
    # Фильтр allowed_class_keys в run_inference уже их отбросил,
    # но в raw_counts они остались — это важно для UX (фронт должен
    # показать пользователю "вот эта деталь вообще не должна тут быть").
    for raw_key, raw_count in inference.raw_counts.items():
        if raw_key in expected_keys:
            continue
        if raw_count <= 0:
            continue

        class_meta = next(
            (c for c in (model.class_meta or []) if c.get("key") == raw_key),
            None,
        )
        display_name = (
            class_meta["name"] if class_meta and class_meta.get("name") else raw_key
        )
        class_group_id = class_meta.get("class_group_id") if class_meta else None

        mismatched.append(display_name)

        details.append(
            {
                "segment_class_id": raw_key,  # UUID в виде строки
                "segment_class_group_id": class_group_id,
                "class_key": raw_key,
                "name": display_name,
                "hue": None,
                "expected_count": 0,
                "detected_count": int(raw_count),
                "delta": int(raw_count),
                "status": "extra",
                "confidence": None,
                # Детекции этого ключа были отсеяны фильтром, поэтому отдельно
                # их не прогоняли. Если хочешь отрисовать их на кадре — нужно
                # второй проход без фильтра или вернуть их из run_inference.
                "detections": [],
            }
        )

    matched = sum(1 for d in details if d["status"] == "ok")
    total = len(expected_items)
    overall_status = (
        "passed"
        if matched == total and not any(d["status"] == "extra" for d in details)
        else "failed"
    )

    if is_task_cancelled_sync(db, task):
        return

    set_task_state_sync(
        db,
        task,
        status="succeeded",
        stage="Готово",
        message="Проверка завершена",
        result={
            "task_id": str(task.id),
            "inspection_id": None,
            "status": overall_status,
            "matched": matched,
            "total": total,
            "missing": mismatched,
            "details": details,
            "mode": mode,
            "model_name": f"{model.architecture}_v{model.version}",
            "debug": {
                "model_class_keys": inference.model_class_keys,
                "raw_counts": dict(inference.raw_counts),
                "imgsz": model.imgsz,
            },
        },
    )
