from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.db import get_sync_session
from app.import_models import import_models
from infra.ml.yolo_inspector import run_inference
from infra.queue.procrastinate import app
from infra.storage.file_storage import resolve_storage_path
from modules.ml_models.models import MlModel
from modules.segments.models import Segment, SegmentGroup
from modules.standards.models import Standard, StandardImage
from modules.tasks.models import Task
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

import_models()


def _get_task(db: Session, task_id: UUID) -> Task | None:
    return db.get(Task, task_id)


def _set_task_state(
    db: Session,
    task: Task,
    *,
    status: str | None = None,
    stage: str | None = None,
    message: str | None = None,
    error: str | None = None,
    result: dict | None = None,
) -> None:
    if status is not None:
        task.status = status
    if stage is not None:
        task.stage = stage
    if message is not None:
        task.message = message
    if error is not None:
        task.error = error[:2000]
    if result is not None:
        task.result = result

    if task.status == "running" and task.started_at is None:
        task.started_at = datetime.now()

    if task.status in {"succeeded", "failed", "cancelled"} and task.finished_at is None:
        task.finished_at = datetime.now()

    db.commit()


def _set_task_progress(
    db: Session,
    task: Task,
    *,
    current: int,
    total: int,
    stage: str,
    message: str | None = None,
) -> None:
    task.progress_current = current
    task.progress_total = total
    task.progress_percent = round(current / total * 100) if total else None
    task.stage = stage
    if message is not None:
        task.message = message
    db.commit()


def _load_standard(db: Session, standard_id: UUID) -> Standard | None:
    result = db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
            selectinload(Standard.segments).selectinload(Segment.segment_group),
            selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
        )
        .where(Standard.id == standard_id)
    )
    return result.scalar_one_or_none()


def _load_model(db: Session, model_id: UUID) -> MlModel | None:
    return db.get(MlModel, model_id)


def _build_expected_items(
    *,
    standard: Standard,
    selected_segment_ids: list[UUID],
) -> list[dict]:
    reference_image = next((img for img in standard.images if img.is_reference), None)
    if reference_image is None:
        raise RuntimeError("У эталона нет reference-изображения")

    annotation_by_segment_id = {
        ann.segment_id: ann for ann in reference_image.annotations if ann.points
    }

    segment_by_id = {segment.id: segment for segment in standard.segments}
    items: list[dict] = []

    for segment_id in selected_segment_ids:
        segment = segment_by_id.get(segment_id)
        if segment is None:
            raise RuntimeError("Выбранный класс не найден в эталоне")

        annotation = annotation_by_segment_id.get(segment.id)
        expected_count = (
            len(annotation.points) if annotation and annotation.points else 0
        )

        items.append(
            {
                "segment_id": segment.id,
                "segment_group_id": segment.segment_group_id,
                "name": segment.name,
                "expected_count": expected_count,
            }
        )

    return items


@app.task(queue="inspection")
def execute_inspection(*, task_id: str) -> None:
    tid = UUID(task_id)

    with get_sync_session() as db:
        task = _get_task(db, tid)
        if not task:
            return

        if task.status == "cancelled":
            return

        payload = task.payload or {}
        standard_id = UUID(payload["standard_id"])
        model_id = UUID(payload["model_id"])
        selected_segment_ids = [UUID(item) for item in payload["selected_segment_ids"]]
        mode = payload.get("mode")

        standard = _load_standard(db, standard_id)
        if standard is None:
            _set_task_state(
                db, task, status="failed", stage="Ошибка", error="Эталон не найден"
            )
            return

        model = _load_model(db, model_id)
        if model is None:
            _set_task_state(
                db, task, status="failed", stage="Ошибка", error="Модель не найдена"
            )
            return

        image_path = resolve_storage_path(payload["image_path"])
        weights_path = resolve_storage_path(model.weights_path)

        try:
            _set_task_state(
                db,
                task,
                status="running",
                stage="Подготовка",
                message="Подготовка контекста проверки",
            )

            _set_task_progress(
                db,
                task,
                current=1,
                total=3,
                stage="Подготовка эталона",
            )

            expected_items = _build_expected_items(
                standard=standard,
                selected_segment_ids=selected_segment_ids,
            )
            allowed_names = {item["name"] for item in expected_items}

            _set_task_progress(
                db,
                task,
                current=2,
                total=3,
                stage="Инференс",
                message="Выполняется анализ изображения",
            )

            inference = run_inference(
                weights_path=weights_path,
                image_path=image_path,
                imgsz=model.imgsz,
                allowed_class_names=allowed_names,
            )

            _set_task_progress(
                db,
                task,
                current=3,
                total=3,
                stage="Сравнение с эталоном",
            )

            details: list[dict] = []
            mismatched: list[str] = []

            for item in expected_items:
                name = item["name"]
                expected_count = item["expected_count"]
                detected_count = int(inference.counts.get(name, 0))
                delta = detected_count - expected_count

                if delta == 0:
                    item_status = "ok"
                elif delta < 0:
                    item_status = "less"
                else:
                    item_status = "more"

                if item_status != "ok":
                    mismatched.append(name)

                details.append(
                    {
                        "segment_id": str(item["segment_id"]),
                        "segment_group_id": str(item["segment_group_id"])
                        if item["segment_group_id"]
                        else None,
                        "name": name,
                        "expected_count": expected_count,
                        "detected_count": detected_count,
                        "delta": delta,
                        "status": item_status,
                        "confidence": inference.avg_confidence.get(name),
                        "detections": inference.grouped_detections.get(name, []),
                    }
                )

            matched = sum(1 for item in details if item["status"] == "ok")
            total = len(details)
            overall_status = "passed" if matched == total else "failed"

            _set_task_state(
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
                },
            )

        except Exception as exc:
            _set_task_state(
                db,
                task,
                status="failed",
                stage="Ошибка",
                error=str(exc),
            )
