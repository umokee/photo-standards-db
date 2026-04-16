import shutil
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ultralytics import YOLO


@dataclass(slots=True)
class TrainingRunConfig:
    yaml_path: Path
    base_weights_path: Path
    output_weights_path: Path
    project_dir: Path
    epochs: int
    imgsz: int
    batch_size: int
    on_status: Callable[[str], None] | None = None
    on_epoch_end: Callable[[int, int], None] | None = None
    cleanup_project_dir: bool = True


@dataclass(slots=True)
class TrainingRunResult:
    output_weights_path: Path
    metrics: dict[str, float | None]
    raw_results: Any | None = None


def _metric(
    results_dict: dict[str, Any],
    *keys: str,
) -> dict[str, float | None]:
    for key in keys:
        val = results_dict.get(key)
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                return None
    return None


def run_training_sync(config: TrainingRunConfig) -> TrainingRunResult:
    if config.on_status:
        config.on_status("training")

    yolo = YOLO(str(config.base_weights_path))

    if config.on_epoch_end:
        yolo.add_callback(
            "on_train_epoch_end",
            lambda trainer: config.on_epoch_end(trainer.epoch + 1, trainer.epochs),
        )

    config.project_dir.mkdir(parents=True, exist_ok=True)
    config.output_weights_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        results = yolo.train(
            data=str(config.yaml_path),
            epochs=config.epochs,
            imgsz=config.imgsz,
            batch=config.batch_size,
            project=str(config.project_dir),
            name="run",
            exist_ok=True,
        )

        if config.on_status:
            config.on_status("saving")

        best_weights_path = config.project_dir / "run" / "weights" / "best.pt"
        if not best_weights_path.exists():
            raise FileNotFoundError(f"best.pt не найден: {best_weights_path}")

        shutil.move(str(best_weights_path), str(config.output_weights_path))

        results_dict = getattr(results, "results_dict", {}) or {}
        metrics = {
            "mAP50": _metric(results_dict, "metrics/mAP50(B)", "metrics/mAP50(M)"),
            "mAP50_95": _metric(
                results_dict, "metrics/mAP50-95(B)", "metrics/mAP50-95(M)"
            ),
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
    finally:
        if config.cleanup_project_dir:
            shutil.rmtree(config.project_dir, ignore_errors=True)
