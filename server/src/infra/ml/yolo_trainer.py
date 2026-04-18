import shutil
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ultralytics import YOLO


class TrainingInterrupted(RuntimeError):
    pass


@dataclass(slots=True)
class TrainingRunConfig:
    yaml_path: Path
    base_weights_path: Path
    checkpoint_path: Path
    best_checkpoint_path: Path
    output_weights_path: Path
    run_dir: Path
    epochs: int
    imgsz: int
    batch_size: int
    resume: bool = False
    save_period: int = 1
    on_status: Callable[[str], None] | None = None
    on_epoch_end: Callable[[int, int], None] | None = None
    on_model_save: Callable[[Path | None, Path | None], None] | None = None
    on_heartbeat: Callable[[], None] | None = None
    should_stop: Callable[[], bool] | None = None


@dataclass(slots=True)
class TrainingRunResult:
    output_weights_path: Path
    metrics: dict[str, float | None]
    raw_results: Any | None = None


def _metric(
    results_dict: dict[str, Any],
    *keys: str,
) -> float | None:
    for key in keys:
        val = results_dict.get(key)
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                return None
    return None


def run_training_sync(
    config: TrainingRunConfig,
) -> TrainingRunResult:
    if config.on_status:
        config.on_status("training")

    source_weights = (
        config.checkpoint_path
        if config.resume and config.checkpoint_path.exists()
        else config.base_weights_path
    )

    yolo = YOLO(str(source_weights))

    if config.on_epoch_end or config.should_stop:

        def _on_epoch_end(trainer):
            current = trainer.epoch + 1
            total = trainer.epochs
            if config.on_epoch_end:
                config.on_epoch_end(current, total)
            if config.should_stop and config.should_stop():
                raise TrainingInterrupted("Training stop requested")

        yolo.add_callback("on_train_epoch_end", _on_epoch_end)

    if config.on_heartbeat or config.should_stop:

        def _on_batch_end(trainer):
            if config.on_heartbeat:
                config.on_heartbeat()
            if config.should_stop and config.should_stop():
                raise TrainingInterrupted("Training stop requested")

        yolo.add_callback("on_train_batch_end", _on_batch_end)

    if config.on_model_save:
        yolo.add_callback(
            "on_model_save",
            lambda trainer: config.on_model_save(
                config.checkpoint_path if config.checkpoint_path.exists() else None,
                config.best_checkpoint_path
                if config.best_checkpoint_path.exists()
                else None,
            ),
        )

    config.run_dir.mkdir(parents=True, exist_ok=True)
    config.output_weights_path.parent.mkdir(parents=True, exist_ok=True)

    project_dir = config.run_dir.parent
    run_name = config.run_dir.name

    results = yolo.train(
        data=str(config.yaml_path),
        epochs=config.epochs,
        imgsz=config.imgsz,
        batch=config.batch_size,
        project=str(project_dir),
        name=run_name,
        exist_ok=True,
        save=True,
        save_period=config.save_period,
        resume=config.resume,
    )

    if config.on_status:
        config.on_status("saving")

    if not config.best_checkpoint_path.exists():
        raise FileNotFoundError(f"best.pt не найден: {config.best_checkpoint_path}")

    shutil.copy2(str(config.best_checkpoint_path), str(config.output_weights_path))

    results_dict = getattr(results, "results_dict", {}) or {}
    metrics = {
        "mAP50": _metric(results_dict, "metrics/mAP50(B)", "metrics/mAP50(M)"),
        "mAP50_95": _metric(results_dict, "metrics/mAP50-95(B)", "metrics/mAP50-95(M)"),
        "precision": _metric(
            results_dict, "metrics/precision(B)", "metrics/precision(M)"
        ),
        "recall": _metric(results_dict, "metrics/recall(B)", "metrics/recall(M)"),
    }

    return TrainingRunResult(
        output_weights_path=config.output_weights_path,
        metrics=metrics,
        raw_results=results,
    )
