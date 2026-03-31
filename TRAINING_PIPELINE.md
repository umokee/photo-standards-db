# Пайплайн обучения модели — ФотоЭталон

## Общая архитектура

Обучение — это фоновый процесс, не зависящий от вкладки браузера.
Источник истины — всегда БД, а не состояние фронтенда.

```
Пользователь → POST /models/train → создаёт MlModel + TrainingTask в БД
                                   → запускает worker-процесс
                                   → возвращает task_id

Worker       → обновляет status/progress в БД через callback
             → по завершении: сохраняет веса, метрики, cleanup

Фронтенд    → polling GET /tasks/{id} каждые 3 сек
             → показывает прогресс/результат
             → при перезагрузке страницы — просто переподключается к текущему состоянию
```

---

## Хранение файлов

```
storage/models/
  {group_id}/
    v1.pt              ← обученные веса версии 1
    v2.pt              ← обученные веса версии 2
    v3.pt              ← ...
    temp/              ← временный датасет, удаляется после обучения
      images/
        train/
        val/
        test/
      labels/
        train/
        val/
        test/
      data.yaml
  _basic/
    yolo12n-seg.pt     ← базовые предобученные веса
    yolo12s-seg.pt
    yolo12m-seg.pt
```

**Принцип:** постоянно хранятся только обученные веса (`v{N}.pt`) и базовые веса (`_basic/`). Датасет — временное рабочее представление, собирается перед обучением из БД + исходных фото, удаляется после.

---

## Модель данных

### MlModel — одна строка = одна версия

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PK |
| group_id | UUID | FK → groups |
| name | str | Автоматическое: `yolo12n-seg_v3` |
| architecture | Enum | `yolo12n-seg`, `yolo12s-seg`, `yolo12m-seg`, `yolo12l-seg`, `yolo12x-seg` |
| weights_path | str | Относительный: `models/{group_id}/v{version}.pt` |
| version | int | Автоинкремент внутри группы |
| epochs | int | Количество эпох |
| imgsz | int | Размер входного изображения (default 640) |
| batch_size | int | Размер батча |
| num_classes | int | Количество классов |
| class_names | JSONB | `["Болт М12", "Разъём XJ-4", ...]` |
| metrics | JSONB | `{mAP50: 0.91, mAP50_95: 0.78, precision: 0.89, recall: 0.87}` |
| is_active | bool | Только одна модель активна на группу |
| trained_at | datetime | Когда завершилось обучение |
| created_at | datetime | Когда создана запись |

### TrainingTask — отслеживание процесса

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PK |
| group_id | UUID | FK → groups |
| model_id | UUID? | FK → ml_models, заполняется при создании модели |
| status | Enum | `pending` → `preparing` → `training` → `saving` → `done` / `failed` |
| progress | int? | Текущая эпоха (для прогресс-бара) |
| stage | str? | Человекочитаемое: "Эпоха 45/100" |
| message | str? | Дополнительная информация |
| error | str? | Текст ошибки при `failed` |
| started_at | datetime? | Начало обучения |
| finished_at | datetime? | Конец обучения |
| created_at | datetime | Когда поставлена в очередь |

---

## Пайплайн обучения — пошагово

### Шаг 1: Сбор данных из БД

`get_data(db, group_id) → TrainingData`

Загружает всё необходимое одним запросом:
- группу
- стандарты группы
- изображения стандартов
- сегменты стандартов
- аннотации изображений

Формирует `class_names` — уникальные имена сегментов. Строит маппинг `segment_id → (class_index, class_name)`.

### Шаг 2: Валидация данных

`validate_data(data: TrainingData) → None | raises ValidationError`

Проверяет:
- есть ли стандарты в группе
- есть ли хотя бы один класс (сегмент)
- есть ли изображения
- есть ли аннотированные изображения
- все ли стандарты имеют фотографии
- все ли стандарты имеют хотя бы одну аннотацию
- нет ли пустых полигонов
- корректны ли индексы классов

### Шаг 3: Планирование сплита

`build_split_plan(data, train_ratio, val_ratio) → TrainingSplitPlan`

- Берёт только аннотированные изображения
- Шаффлит внутри каждого стандарта
- Делит по пропорции (например 70/20/10)
- Ограничения: `train ≤ 80%`, `train + val ≤ 90%`
- Возвращает списки `image_id` для train/val/test

### Шаг 4: Сборка временного датасета

`build_dataset(data, split_plan) → (dataset_path, yaml_path)`

1. Создаёт `storage/models/{group_id}/temp/`
2. Для каждого сплита (train/val/test):
   - **Симлинки** на оригинальные фото (не копирование!)
   - Генерирует `.txt` файлы с YOLO-seg разметкой
3. Создаёт `data.yaml`

**Формат YOLO-seg разметки** (`.txt` файл для каждого изображения):
```
{class_index} {x1/w} {y1/h} {x2/w} {y2/h} ... {xN/w} {yN/h}
{class_index} {x1/w} {y1/h} ...
```
Координаты нормализованы (0..1) относительно размеров изображения.

**data.yaml:**
```yaml
path: /absolute/path/to/temp
train: images/train
val: images/val
test: images/test
nc: 5
names: ["Болт М12", "Разъём XJ-4", "Гайка М8", ...]
```

### Шаг 5: Запуск обучения (в отдельном процессе)

`run_training_sync(...)` — блокирующая функция, выполняется в `multiprocessing.Process`

```python
def run_training_sync(model_id, task_id, yaml_path, weights_path,
                      group_id, version, epochs, imgsz, batch_size):
    model = YOLO(weights_path)

    # Callback — пишет прогресс в БД после каждой эпохи
    def on_epoch_end(trainer):
        update_task_progress(
            task_id=task_id,
            progress=trainer.epoch + 1,
            stage=f"Эпоха {trainer.epoch + 1}/{epochs}",
        )

    model.add_callback("on_train_epoch_end", on_epoch_end)

    try:
        update_task_status(task_id, "training", started_at=now())

        results = model.train(
            data=yaml_path,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch_size,
            project=str(temp_dir),
            name="run",
            exist_ok=True,
        )

        # Перемещаем best.pt → v{version}.pt
        src = temp_dir / "run" / "weights" / "best.pt"
        dst = STORAGE_PATH / "models" / group_id / f"v{version}.pt"
        shutil.move(str(src), str(dst))

        # Сохраняем метрики в БД
        update_task_status(task_id, "saving")
        update_model_record(
            model_id=model_id,
            weights_path=f"models/{group_id}/v{version}.pt",
            metrics={
                "mAP50": results.results_dict.get("metrics/mAP50(B)"),
                "mAP50_95": results.results_dict.get("metrics/mAP50-95(B)"),
                "precision": results.results_dict.get("metrics/precision(B)"),
                "recall": results.results_dict.get("metrics/recall(B)"),
            },
            trained_at=now(),
        )
        update_task_status(task_id, "done", finished_at=now())

    except Exception as e:
        update_task_status(task_id, "failed", error=str(e), finished_at=now())

    finally:
        # Cleanup: удаляем временный датасет и мусор ultralytics
        shutil.rmtree(str(temp_dir), ignore_errors=True)
```

### Шаг 6: Сохранение модели

Происходит внутри worker-а:
- `weights_path` обновляется на `models/{group_id}/v{version}.pt`
- `metrics` (JSONB) заполняется результатами
- `trained_at` ставится
- `TrainingTask.status` = `done`

---

## Оркестратор (в роуте)

```python
async def run_train(db, data: MlModelTrainRequest):
    # 1. Проверяем — нет ли уже активного обучения для группы
    active = await get_active_task(db, data.group_id)
    if active:
        raise ConflictError("Обучение уже запущено для этой группы")

    # 2. Собираем и валидируем данные
    train_data = await get_data(db, data.group_id)
    await validate_data(train_data)

    # 3. Планируем сплит
    split_plan = await build_split_plan(train_data, data.train_ratio, data.val_ratio)

    # 4. Собираем датасет
    dataset_path, yaml_path = await build_dataset(train_data, split_plan)

    # 5. Создаём записи в БД
    version = await next_version(db, data.group_id)
    model = MlModel(
        group_id=data.group_id,
        name=f"{data.architecture}_v{version}",
        architecture=data.architecture,
        weights_path="",  # заполнится worker-ом
        version=version,
        epochs=data.epochs,
        imgsz=data.imgsz,
        batch_size=data.batch_size,
        num_classes=len(train_data.class_names),
        class_names=train_data.class_names,
    )
    db.add(model)

    task = TrainingTask(
        group_id=data.group_id,
        model_id=model.id,
        status="pending",
    )
    db.add(task)
    await db.commit()

    # 6. Запускаем фоновый процесс
    weights_path = str(STORAGE_PATH / "models" / "_basic" / f"{data.architecture}.pt")
    process = multiprocessing.Process(
        target=run_training_sync,
        args=(str(model.id), str(task.id), yaml_path, weights_path,
              str(data.group_id), version, data.epochs, data.imgsz, data.batch_size),
    )
    process.start()

    return task
```

---

## Блокировка GPU (очередь)

GPU на сервере один. Два одновременных `YOLO.train()` уронят систему.

**Простой вариант (для диплома):** перед запуском проверяем — есть ли задача со статусом `training` (для любой группы):

```python
async def get_active_task(db, group_id=None):
    query = select(TrainingTask).where(
        TrainingTask.status.in_(["pending", "preparing", "training"])
    )
    if group_id:
        query = query.where(TrainingTask.group_id == group_id)
    return (await db.execute(query)).scalar_one_or_none()
```

Если есть — возвращаем `409 Conflict`, фронт показывает "Обучение уже выполняется".

**Продвинутый вариант (очередь):** задачи со статусом `pending` ждут в БД, фоновый worker берёт по одной:

```python
# worker.py — отдельный процесс
while True:
    next_task = db.query(TrainingTask).filter(
        TrainingTask.status == "pending"
    ).order_by(TrainingTask.created_at.asc()).first()

    if next_task:
        next_task.status = "preparing"
        db.commit()
        run_training_sync(...)  # блокирующий вызов
    else:
        time.sleep(5)
```

Фронт показывает: "В очереди (позиция 3)".

В тексте ВКР: *"Реализована очередь обучения на основе БД с возможностью замены на брокер сообщений (arq/Celery) при масштабировании"*.

---

## API эндпоинты

### POST /models/train
Запуск обучения. Тело: `MlModelTrainRequest`.
Возвращает `TrainingTaskResponse` с `task_id`.

### GET /models/tasks/{task_id}
Статус задачи обучения. Для polling с фронта.

### GET /models/tasks?group_id=...
Список задач (очередь + история) для группы.

### GET /models?group_id=...
Список обученных моделей группы (таблица версий с метриками).

### PUT /models/{model_id}/activate
Активирует модель. Деактивирует предыдущую активную в этой группе.

### DELETE /models/{model_id}
Удаляет модель + файл весов.

---

## Фронтенд — polling

```typescript
const { data: task } = useQuery({
  queryKey: ['training-task', taskId],
  queryFn: () => getTrainingTask(taskId),
  refetchInterval: (query) => {
    const status = query.state.data?.status
    return status === 'training' || status === 'pending' || status === 'preparing'
      ? 3000     // поллим каждые 3 сек
      : false    // останавливаем при done/failed
  },
})
```

При открытии страницы Training:
1. `GET /models/tasks?group_id=X` — если есть задача в `pending`/`training` → показываем прогресс
2. `GET /models?group_id=X` — таблица версий с метриками
3. Кнопка "Обучить" дизейблится если есть активная задача

---

## Прогресс обучения

Worker пишет в БД через ultralytics callback после каждой эпохи:

| Поле | Пример |
|------|--------|
| progress | 45 |
| stage | "Эпоха 45/100" |

Фронт рассчитывает процент: `progress / model.epochs * 100`.

Дополнительно можно писать текущие потери (loss) для графика обучения.

---

## Statuses flow

```
pending → preparing → training → saving → done
    ↓         ↓           ↓         ↓
  failed    failed      failed    failed
```

- **pending** — в очереди, ждёт GPU
- **preparing** — собирается датасет
- **training** — идёт обучение (progress обновляется)
- **saving** — перемещение весов, запись метрик
- **done** — всё готово
- **failed** — ошибка на любом этапе (текст в `error`)

---

## Активация модели

На каждую группу — одна активная модель (`is_active = true`). При инспекции система берёт активную модель группы.

`PUT /models/{id}/activate`:
1. Находим все модели группы с `is_active = true` → ставим `false`
2. Ставим `is_active = true` на выбранную

---

## Инспекция (как модель используется)

```
Новое фото
  → загрузить активную модель группы (YOLO)
  → inference → детекции (class_name, confidence, polygon)
  → match с эталонными полигонами (SegmentAnnotation) по IoU
  → для каждого сегмента: найден / не найден / не на месте
  → сохранить InspectionResult + InspectionSegmentResults
  → отрисовать рамки (зелёные/красные) на result_image
```

**Три уровня проверки:**

1. **Наличие класса** — YOLO нашла объект нужного класса с confidence ≥ threshold
2. **Позиция (IoU)** — полигон детекции совпадает с эталонным полигоном (IoU ≥ порог)
3. **Матчинг** — жадное сопоставление эталонных сегментов с детекциями по максимальному IoU (решает проблему нескольких объектов одного класса)

```python
from shapely.geometry import Polygon

def compute_iou(poly_a, poly_b):
    a = Polygon(poly_a)
    b = Polygon(poly_b)
    intersection = a.intersection(b).area
    union = a.union(b).area
    return intersection / union if union > 0 else 0
```

---

## Что сейчас не реализовано

- [ ] `run_training_sync` — тело функции (запуск YOLO + callbacks)
- [ ] Worker-процесс (multiprocessing или отдельный скрипт)
- [ ] `TrainingTaskResponse` схема
- [ ] Эндпоинты для задач (`GET /tasks/{id}`, `GET /tasks`)
- [ ] Cleanup temp-папки после обучения
- [ ] Блокировка GPU (проверка активных задач перед запуском)
- [ ] Реальный YOLO inference в инспекции (сейчас мок с `random.uniform`)
- [ ] `_next_version` helper
- [ ] Удаление модели с файлом весов
- [ ] Отмена обучения

---

## Известные баги в текущем коде

1. **`yolov26` не существует** — в models.py/schemas.py `yolov26n-seg` и т.д. Нужно `yolo12n-seg`
2. **Смешанные импорты** — `from backend.src.mls.schemas import ...` (абсолютный) рядом с `from ..config import ...` (относительный)
3. **Инспекция — мок** — `inspections/routes.py` генерирует рандомные confidence вместо реального inference
4. **`InspectionSegmentResult`** использует `segment_id` в routes.py, но в models.py поле `segment_group_id` — несоответствие
