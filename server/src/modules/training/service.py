from __future__ import annotations

import asyncio
import shutil
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from app.db import AsyncSessionLocal, get_sync_session
from app.exception import NotFoundError, ValidationError
from constants import training
from infra.ml.yolo_trainer import (
    TrainingInterrupted,
    TrainingRunConfig,
    TrainingRunResult,
    run_training_sync,
)
from infra.queue.scheduler import (
    ensure_no_active_task_for_group,
    schedule_training,
)
from infra.storage.file_storage import resolve_storage_path
from modules.groups.models import Group
from modules.ml_models.models import MlModel
from modules.tasks.constants import (
    GPU_QUEUE,
    PRIORITY_TRAINING,
    STATUS_FAILED,
    STATUS_PAUSED,
    STATUS_RESUMING,
    STATUS_RUNNING,
    STATUS_SUCCEEDED,
    TASK_TRAINING,
)
from modules.tasks.models import Task
from modules.tasks.service import (
    create_task,
    update_task_status,
)
from modules.training._dataset import (
    build_temp_dataset,
    plan_dataset_split,
    validate_training_data,
)
from modules.training._loader import load_training_data
from modules.training.reporter import TrainingProgressReporter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import TrainRequest


@dataclass(slots=True)
class _TrainingPaths:
    base_weights: Path
    dataset_root: Path
    run_dir: Path
    checkpoint: Path
    best_checkpoint: Path
    final_weights: Path
    final_weights_rel: str

    @classmethod
    def from_payload(cls, payload: dict) -> _TrainingPaths:
        return cls(
            base_weights=resolve_storage_path(payload["base_weights_path"]),
            dataset_root=resolve_storage_path(payload["dataset_root"]),
            run_dir=resolve_storage_path(payload["run_dir"]),
            checkpoint=resolve_storage_path(payload["checkpoint_path"]),
            best_checkpoint=resolve_storage_path(payload["best_checkpoint_path"]),
            final_weights=resolve_storage_path(payload["final_weights_path"]),
            final_weights_rel=payload["final_weights_path"],
        )


@dataclass(slots=True)
class _TrainingParams:
    epochs: int
    imgsz: int
    batch_size: int
    train_ratio: int
    val_ratio: int

    @classmethod
    def from_payload(cls, payload: dict) -> _TrainingParams:
        return cls(
            epochs=int(payload["epochs"]),
            imgsz=int(payload["imgsz"]),
            batch_size=int(payload["batch_size"]),
            train_ratio=int(payload["train_ratio"]),
            val_ratio=int(payload["val_ratio"]),
        )


@dataclass(slots=True)
class _DatasetInfo:
    class_keys: list[str]
    class_meta: list[dict]
    yaml_path: Path


async def start_training(db: AsyncSession, data: TrainRequest) -> tuple[Task, MlModel]:
    group = await db.get(Group, data.group_id)
    if group is None:
        raise NotFoundError("Группа", data.group_id)

    await ensure_no_active_task_for_group(
        db, group_id=data.group_id, type=TASK_TRAINING
    )

    base_weights_rel = _base_weights_rel(data.architecture)
    if not resolve_storage_path(base_weights_rel).is_file():
        raise ValidationError(f"Базовые веса не найдены: {base_weights_rel}")

    version = await _next_version(db, data.group_id)
    model = _create_ml_model(db, data, version)
    await db.flush()

    task = await create_task(
        db,
        type=TASK_TRAINING,
        status="pending",
        queue=GPU_QUEUE,
        priority=PRIORITY_TRAINING,
        entity_type="ml_model",
        entity_id=model.id,
        group_id=data.group_id,
        auto_resume=True,
    )

    payload, run_dir_rel, checkpoint_rel = _build_training_payload(
        model_id=model.id,
        group_id=data.group_id,
        task_id=task.id,
        version=version,
        data=data,
        base_weights_rel=base_weights_rel,
    )
    task.payload = payload
    task.run_dir = run_dir_rel
    task.checkpoint_path = checkpoint_rel
    await db.commit()
    await db.refresh(task)
    await db.refresh(model)

    task = await schedule_training(db, task)
    return task, model


async def run_training_task(task_id: str) -> None:
    task_uuid = UUID(task_id)

    async with AsyncSessionLocal() as db:
        task = await db.get(Task, task_uuid)
        if task is None:
            return

        model = await _load_model_or_fail(db, task)
        if model is None:
            return

        paths = _TrainingPaths.from_payload(task.payload or {})
        params = _TrainingParams.from_payload(task.payload or {})
        resume = paths.checkpoint.exists()

        await update_task_status(
            db,
            task_id=task_uuid,
            status=STATUS_RESUMING if resume else STATUS_RUNNING,
            stage="Возобновление" if resume else "Подготовка данных",
            message="Продолжаем обучение" if resume else "Сбор данных для обучения",
        )

        try:
            dataset_info = await _prepare_dataset(db, model, params, paths)
            result = await _run_training(
                db, task_uuid, paths, params, dataset_info, resume
            )
            await _finalize_success(db, task_uuid, model, paths, result, dataset_info)

        except TrainingInterrupted:
            await _mark_paused(db, task_uuid)

        except Exception as exc:  # noqa: BLE001 — terminal failure handler
            await _finalize_failure(db, task_uuid, model, paths, exc)

        finally:
            shutil.rmtree(paths.dataset_root, ignore_errors=True)


async def _load_model_or_fail(db: AsyncSession, task: Task) -> MlModel | None:
    if task.entity_id is None:
        await update_task_status(
            db,
            task_id=task.id,
            status=STATUS_FAILED,
            stage="Ошибка",
            error="В задаче отсутствует ссылка на модель",
        )
        return None
    model = await db.get(MlModel, task.entity_id)
    if model is None:
        await update_task_status(
            db,
            task_id=task.id,
            status=STATUS_FAILED,
            stage="Ошибка",
            error="Модель не найдена",
        )
        return None
    return model


async def _prepare_dataset(
    db: AsyncSession,
    model: MlModel,
    params: _TrainingParams,
    paths: _TrainingPaths,
) -> _DatasetInfo:
    training_data = await load_training_data(db, model.group_id)
    validate_training_data(training_data)
    split = plan_dataset_split(
        training_data,
        train_ratio=params.train_ratio,
        val_ratio=params.val_ratio,
    )
    build_result = build_temp_dataset(
        training_data, split, dataset_root=paths.dataset_root
    )

    model.num_classes = len(training_data.class_keys)
    model.class_keys = training_data.class_keys
    model.class_meta = training_data.class_meta
    model.total_images = split.total
    model.train_count = len(split.train)
    model.val_count = len(split.val)
    model.test_count = len(split.test)
    await db.commit()

    return _DatasetInfo(
        class_keys=training_data.class_keys,
        class_meta=training_data.class_meta,
        yaml_path=build_result.yaml_path,
    )


async def _run_training(
    db: AsyncSession,
    task_id: UUID,
    paths: _TrainingPaths,
    params: _TrainingParams,
    dataset_info: _DatasetInfo,
    resume: bool,
) -> TrainingRunResult:
    loop = asyncio.get_running_loop()
    reporter = TrainingProgressReporter(db, task_id, loop)

    config = TrainingRunConfig(
        yaml_path=dataset_info.yaml_path,
        base_weights_path=paths.base_weights,
        checkpoint_path=paths.checkpoint,
        best_checkpoint_path=paths.best_checkpoint,
        output_weights_path=paths.final_weights,
        run_dir=paths.run_dir,
        epochs=params.epochs,
        imgsz=params.imgsz,
        batch_size=params.batch_size,
        resume=resume,
        save_period=1,
        on_status=reporter.on_status,
        on_epoch_end=reporter.on_epoch_end,
        on_model_save=reporter.on_model_save,
        on_heartbeat=reporter.on_heartbeat,
        should_stop=lambda: _is_stop_requested(task_id),
    )
    return await asyncio.to_thread(run_training_sync, config)


async def _finalize_success(
    db: AsyncSession,
    task_id: UUID,
    model: MlModel,
    paths: _TrainingPaths,
    result: TrainingRunResult,
    dataset_info: _DatasetInfo,
) -> None:
    model.weights_path = paths.final_weights_rel
    model.metrics = result.metrics
    model.trained_at = datetime.now(UTC).replace(tzinfo=None)
    await db.commit()

    await update_task_status(
        db,
        task_id=task_id,
        status=STATUS_SUCCEEDED,
        stage="Готово",
        message="Обучение завершено",
        result={
            "model_id": str(model.id),
            "weights_path": model.weights_path,
            "class_keys": dataset_info.class_keys,
            "class_meta": dataset_info.class_meta,
            "metrics": result.metrics,
        },
    )


async def _finalize_failure(
    db: AsyncSession,
    task_id: UUID,
    model: MlModel,
    paths: _TrainingPaths,
    exc: Exception,
) -> None:
    paths.final_weights.unlink(missing_ok=True)
    model.weights_path = None
    model.metrics = None
    model.trained_at = None
    await db.commit()

    await update_task_status(
        db,
        task_id=task_id,
        status=STATUS_FAILED,
        stage="Ошибка",
        message="Обучение прервано из-за ошибки",
        error=str(exc),
    )


async def _mark_paused(db: AsyncSession, task_id: UUID) -> None:
    await update_task_status(
        db,
        task_id=task_id,
        status=STATUS_PAUSED,
        stage="Приостановлено",
        message="Обучение остановлено и будет продолжено позже",
    )


def _base_weights_rel(architecture: str) -> str:
    name = training.architectures.base_weights[architecture]
    return (Path("models") / "_basic" / name).as_posix()


async def _next_version(db: AsyncSession, group_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(MlModel.version), 0)).where(
            MlModel.group_id == group_id
        )
    )
    return int(result.scalar_one()) + 1


def _create_ml_model(db: AsyncSession, data: TrainRequest, version: int) -> MlModel:
    model = MlModel(
        group_id=data.group_id,
        architecture=data.architecture,
        version=version,
        epochs=data.epochs,
        imgsz=data.imgsz,
        batch_size=data.batch_size,
        train_ratio=data.train_ratio,
        val_ratio=data.val_ratio,
        test_ratio=100 - data.train_ratio - data.val_ratio,
    )
    db.add(model)
    return model


def _build_training_payload(
    *,
    model_id: UUID,
    group_id: UUID,
    task_id: UUID,
    version: int,
    data: TrainRequest,
    base_weights_rel: str,
) -> tuple[dict, str, str]:
    task_root = Path("models") / str(group_id) / "tasks" / str(task_id)
    dataset_root_rel = (task_root / "dataset").as_posix()
    run_dir_rel = (task_root / "run").as_posix()
    checkpoint_rel = (task_root / "run" / "weights" / "last.pt").as_posix()
    best_checkpoint_rel = (task_root / "run" / "weights" / "best.pt").as_posix()
    final_weights_rel = (Path("models") / str(group_id) / f"v{version}.pt").as_posix()

    payload = {
        "model_id": str(model_id),
        "group_id": str(group_id),
        "version": version,
        "architecture": data.architecture,
        "epochs": data.epochs,
        "imgsz": data.imgsz,
        "batch_size": data.batch_size,
        "train_ratio": data.train_ratio,
        "val_ratio": data.val_ratio,
        "base_weights_path": base_weights_rel,
        "dataset_root": dataset_root_rel,
        "run_dir": run_dir_rel,
        "checkpoint_path": checkpoint_rel,
        "best_checkpoint_path": best_checkpoint_rel,
        "final_weights_path": final_weights_rel,
    }
    return payload, run_dir_rel, checkpoint_rel


def _is_stop_requested(task_id: UUID) -> bool:
    with get_sync_session() as db:
        task = db.get(Task, task_id)
        if task is None:
            return True
        return bool(task.abort_requested or task.status == "cancelled")
