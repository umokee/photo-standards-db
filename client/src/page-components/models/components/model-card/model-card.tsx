import Button from "@/components/ui/button/button";
import { Badge } from "@/components/ui/badge/badge";
import { GroupDetail, Metric, MlModel, TaskResponse, TrainingStatus } from "@/types/contracts";
import { formatDate } from "@/utils/formatDate";
import { architectureLabel, metricLabel, trainingStatusLabel } from "@/utils/labels";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import {
  getTrainingPercent,
  getTrainingStatus,
  isTrainingFailedModel,
  isTrainingModel,
} from "../../lib/training";
import s from "./model-card.module.scss";

type Props = {
  model: MlModel;
  task?: TaskResponse | null;
  group?: GroupDetail | null;
  expanded: boolean;
  onToggle: () => void;
  onActivate?: (modelId: string) => void;
  isActivating?: boolean;
};

const statusBadgeTypeMap: Record<TrainingStatus, "info" | "success" | "warning" | "danger"> = {
  pending: "warning",
  preparing: "info",
  training: "info",
  saving: "info",
  done: "success",
  failed: "danger",
};

export const ModelCard = ({
  model,
  task = null,
  group,
  expanded,
  onToggle,
  onActivate,
  isActivating = false,
}: Props) => {
  const status = getTrainingStatus(model, task);
  const progress = getTrainingPercent(model, task);
  const isTraining = isTrainingModel(model, task);

  const statusBadge = model.is_active
    ? { type: "success" as const, label: "Активна" }
    : { type: statusBadgeTypeMap[status] ?? "info", label: trainingStatusLabel(status) };

  const trainingStageLabel =
    status === "pending" ? "Ожидает запуска" : (task?.stage ?? trainingStatusLabel(status));

  const hasRealProgress = status === "training" || status === "saving";
  const trainingProgressLabel = hasRealProgress ? `${progress}%` : trainingStatusLabel(status);

  const metaParameters = [
    ...(model.trained_at ? [{ label: "Обучена", value: formatDate(model.trained_at) }] : []),
    { label: "mAP50", value: formatMetric(model.metrics?.mAP50) },
    { label: "Precision", value: formatMetric(model.metrics?.precision) },
  ];

  const statusMessage =
    status === "failed"
      ? (task?.error ?? "Ошибка обучения")
      : isTraining
        ? trainingStageLabel
        : null;

  const statusValue = isTraining ? trainingProgressLabel : null;

  return (
    <article className={clsx(s.root, expanded && s.expanded)}>
      <div className={s.header} onClick={onToggle}>
        <div className={s.titleRow}>
          <div className={s.info}>
            <span className={s.title}>
              {architectureLabel(model.architecture)} &middot; v{model.version}
            </span>
            <div className={s.meta}>
              {metaParameters.map(({ label, value }) => (
                <span key={label}>
                  {label} <strong>{value}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className={s.side}>
            <Badge type={statusBadge.type}>{statusBadge.label}</Badge>
            <ChevronRight className={s.chevron} size={16} />
          </div>
        </div>

        {statusMessage && (
          <div className={clsx(s.headerStatus, status === "failed" && s.error)}>
            <div className={s.meta}>
              <span>{statusMessage}</span>
              {statusValue && <strong>{statusValue}</strong>}
            </div>

            {isTraining && (
              <div className={s.progress}>
                <div className={s.fill} style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className={s.body}>
          <ModelCardDetail
            model={model}
            task={task}
            group={group}
            onActivate={onActivate}
            isActivating={isActivating}
          />
        </div>
      )}
    </article>
  );
};

interface DetailProps {
  model: MlModel | null;
  task?: TaskResponse | null;
  group?: GroupDetail | null;
  onActivate?: (modelId: string) => void;
  isActivating?: boolean;
}

const metricKeys: Metric[] = ["mAP50", "mAP50_95", "precision", "recall"];

const formatMetric = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "n/a";
  return value.toFixed(3);
};

const ModelCardDetail = ({ model, task, onActivate, isActivating = false }: DetailProps) => {
  const isFailed = isTrainingFailedModel(model, task ?? null);
  const isTraining = isTrainingModel(model, task ?? null);
  const canActivate = !!onActivate && !model.is_active && !!model.trained_at && !isTraining;

  const parameterRows = [
    { label: "Архитектура", value: model.architecture },
    { label: "Эпох", value: model.epochs ?? "n/a" },
    { label: "Размер изображения", value: model.imgsz },
    { label: "Batch size", value: model.batch_size ?? "n/a" },
  ];

  const datasetRows = [
    { label: "Всего изображений", value: model.total_images ?? "n/a" },
    {
      label: "Train",
      value:
        model.train_count !== null && model.train_count !== undefined
          ? `${model.train_ratio}% (${model.train_count})`
          : `${model.train_ratio}%`,
    },
    {
      label: "Val",
      value:
        model.val_count !== null && model.val_count !== undefined
          ? `${model.val_ratio}% (${model.val_count})`
          : `${model.val_ratio}%`,
    },
    {
      label: "Test",
      value:
        model.test_count !== null && model.test_count !== undefined
          ? `${model.test_ratio}% (${model.test_count})`
          : `${model.test_ratio}%`,
    },
  ];

  return (
    <div className={s.detail}>
      <div className={s.detailGrid}>
        <div className={s.detailSection}>
          <div className={s.title}>Датасет обучения</div>
          {datasetRows.map((item) => (
            <div key={item.label} className={s.kv}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className={s.detailSection}>
          <div className={s.title}>Параметры</div>
          {parameterRows.map((item) => (
            <div key={item.label} className={s.kv}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className={s.detailSection}>
          <div className={s.title}>Метрики</div>
          {metricKeys.map((key) => (
            <div key={key} className={s.kv}>
              <span>{metricLabel(key)}</span>
              <strong>{formatMetric(model.metrics?.[key])}</strong>
            </div>
          ))}
        </div>
      </div>

      {isFailed && task?.error && (
        <div className={s.detailSection}>
          <div className={s.title}>Ошибка обучения</div>
          <div className={s.emptyText}>{task?.error}</div>
        </div>
      )}

      {model.class_names && (
        <div className={clsx(s.detailSection, s.bordered)}>
          <div className={s.title}>Классы модели &middot; {model.num_classes}</div>
          <div className={s.classList}>
            {model.class_names.map((className) => (
              <Badge key={className}>{className}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className={clsx(s.detailSection, s.bordered)}>
        <div className={s.title}>Управление</div>

        {model.is_active ? (
          <div className={s.emptyText}>Эта модель уже используется для проверки.</div>
        ) : canActivate ? (
          <div className={s.actions}>
            <Button
              size="sm"
              variant="ml"
              disabled={isActivating}
              onClick={() => onActivate(model.id)}
            >
              {isActivating ? "Активация..." : "Сделать активной"}
            </Button>
            <div className={s.emptyText}>
              После активации именно эта модель будет использоваться в inspection для группы.
            </div>
          </div>
        ) : (
          <div className={s.emptyText}>
            {!model.trained_at
              ? "Активировать можно только после успешного обучения."
              : isTraining
                ? "Нельзя активировать модель во время обучения."
                : "Модель сейчас нельзя активировать."}
          </div>
        )}
      </div>
    </div>
  );
};
