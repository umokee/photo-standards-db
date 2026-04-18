from __future__ import annotations

import asyncio
import time
from pathlib import Path
from uuid import UUID

from modules.tasks.constants import STATUS_RUNNING
from modules.tasks.service import (
    heartbeat_task,
    update_task_progress,
    update_task_status,
)
from sqlalchemy.ext.asyncio import AsyncSession


class TrainingProgressReporter:
    HEARTBEAT_MIN_INTERVAL = 30.0

    _STAGE_LABELS = {
        "training": "Обучение",
        "saving": "Сохранение весов",
    }

    def __init__(
        self,
        db: AsyncSession,
        task_id: UUID,
        loop: asyncio.AbstractEventLoop,
    ) -> None:
        self._db = db
        self._task_id = task_id
        self._loop = loop
        self._last_heartbeat_at: float = 0.0

    def on_status(self, stage: str) -> None:
        readable = self._STAGE_LABELS.get(stage, stage)
        self._run(
            update_task_status(
                self._db,
                task_id=self._task_id,
                status=STATUS_RUNNING,
                stage=readable,
                message=readable,
            )
        )

    def on_epoch_end(self, current: int, total: int) -> None:
        self._last_heartbeat_at = time.monotonic()
        self._run(
            update_task_progress(
                self._db,
                task_id=self._task_id,
                current=current,
                total=total,
                stage=f"Эпоха {current}/{total}",
            )
        )

    def on_model_save(self, last: Path | None, best: Path | None) -> None:
        self._last_heartbeat_at = time.monotonic()
        self._run(
            update_task_status(
                self._db,
                task_id=self._task_id,
                status=STATUS_RUNNING,
            )
        )

    def on_heartbeat(self) -> None:
        now = time.monotonic()
        if now - self._last_heartbeat_at < self.HEARTBEAT_MIN_INTERVAL:
            return
        self._last_heartbeat_at = now
        self._run(heartbeat_task(self._db, self._task_id))

    def _run(self, coro) -> None:
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        future.result()
