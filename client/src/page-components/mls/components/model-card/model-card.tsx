import { Badge } from "@/components/ui/badge/badge";
import Button from "@/components/ui/button/button";
import ProgressBar from "@/components/ui/progress-bar/progress-bar";
import { ACTIVE_TRAINING_STATUSES } from "@/constants";
import { getTrainingPercent, GroupDetail, MlModel, TrainingStatus } from "@/types/contracts";
import { formatDate } from "@/utils/formatDate";
import { trainingStatusLabel } from "@/utils/labels";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import s from "./model-card.module.scss";
import sd from "./model-details.module.scss";

type Props = {
  model: MlModel;
  expanded: boolean;
  group?: GroupDetail | null;
  pendingLabel?: string;
  isActivating?: boolean;
  onToggle: () => void;
  onActivate?: () => void;
};

const getModelStatus = (model: MlModel): TrainingStatus =>
  model.training_status ?? (model.trained_at ? "done" : "pending");

const getModelProgress = (model: MlModel) => {
  if (model.training_status === "saving") return 100;
  if (model.training_progress === null || !model.epochs) return 0;
  return Math.min(100, Math.round((model.training_progress / model.epochs) * 100));
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
  expanded,
  onToggle,
  group,
  pendingLabel = "В очереди",
  isActivating = false,
  onActivate,
}: Props) => {
  const status = getTraining(model);
  const progress = getModelProgress(model);
  const isTraining = ACTIVE_TRAINING_STATUSES.includes(status);
  const isTrained = !!model.trained_at;

  const statusBadge = model.is_active
    ? { type: "success" as const, label: "Активна" }
    : { type: statusBadgeTypeMap[status], label: trainingStatusLabel(status) };

  const trainingStageLabel =
    status === "pending" ? pendingLabel : (model.training_stage ?? trainingStatusLabel(status));

  const hasRealProgress = status === "training" || status === "saving";
  const trainingProgressLabel = hasRealProgress ? `${progress}%` : trainingStatusLabel(status);

  return (
    <article className={clsx(s.root, expanded && s.expanded)}>
      <button type="button" className={s.header} onClick={onToggle} aria-expanded={expanded}>
        <div className={s.main}>
          <div className={s.titleRow}>
            <span className={s.title}>{model.name}</span>
            <div className={s.side}>
              <Badge type={statusBadge.type}>{statusBadge.label}</Badge>
              <ChevronRight className={s.chevron} size={16} />
            </div>
          </div>
          {isTrained ? (
            <div className={s.summary}>
              <Badge>
                {model.architecture} &middot; v{model.version}
              </Badge>
              <Badge>mAP50: {formatMetric(model.metrics?.mAP50)}</Badge>
              <Badge>Precision: {formatMetric(model.metrics?.precision)}</Badge>
              <Badge>Обучена: {formatDate(model.trained_at!)}</Badge>
            </div>
          ) : status === "failed" ? (
            <span className={s.errorPreview}>{model.training_error ?? "Ошибка обучения"}</span>
          ) : null}
        </div>

        {isTraining && (
          <div className={s.trainingSummary}>
            <div className={s.meta}>
              <span>{trainingStageLabel} </span>
              <strong>{trainingStageProgress}</strong>
            </div>

            <div className={s.progress}>
              <div className={s.fill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </button>

      {expanded && (
        <div className={s.body}>
          <ModelCardDetail
            group={group}
            model={model}
            pendingLabel={pendingLabel}
            onActivate={onActivate}
          />
        </div>
      )}
    </article>
  );
};

interface DetailProps {
  group?: GroupDetail | null;
  model: MlModel | null;
  pendingLabel?: string;
  onActivate?: () => void;
  isActivating?: boolean;
}


const formatMetric = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "n/a";
  return value.toFixed(3);
};

const ModelCardDetail = ({
  group,
  model,
  pendingLabel = "В очереди",
  onActivate,
  isActivating,
}: DetailProps) => {
  const status = model.training_status;
  const isTrained = !!model.trained_at;
  const isDeployActive = model.is_active && isTrained;
  const isQueued = status === "pending";
  const isBusy = status !== null && ["preparing", "training", "saving"].includes(status);
  const isFailed = status === "failed";
  const progress = getTrainingPercent(model);
  const canActivate = !!onActivate && !isActivating;

  return (
    <div className={sd.root}>
      {canActivate && (
        <Button variant="ml" size="sm" disabled={!canActivate} onClick={onActivate}>
          Активировать
        </Button>
      )}
      <div className={sd.hero}>
        <div>
          <div className={sd.name}>{model.name}</div>
          <div className={sd.meta}>
            {model.architecture} · v{model.version} · {formatDate(model.created_at)}
          </div>
        </div>
        <div className={sd.metricsPreview}>
          <div>
            <span>Классов</span>
            <strong>{model.num_classes ?? group?.stats.segment_groups_count ?? "n/a"}</strong>
          </div>
          <div>
            <span>Эпох</span>
            <strong>{model.epochs ?? "n/a"}</strong>
          </div>
          <div>
            <span>Размер</span>
            <strong>{model.imgsz}</strong>
          </div>
        </div>
      </div>

      {group && (
        <div className={sd.standards}>
          <div className={sd.blockTitle}>Покрытие эталонов</div>
          <div className={sd.standardList}>
            {group.standards.map((standard) => (
              <div key={standard.id} className={sd.standardRow}>
                <span className={sd.standardName}>{standard.name ?? "Без названия"}</span>
                <ProgressBar
                  value={standard.annotated_images_count}
                  max={standard.images_count}
                  warn={standard.annotated_images_count < standard.images_count}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={sd.grid}>
        <div className={sd.card}>
          <div className={sd.blockTitle}>Параметры</div>
          <div className={sd.kv}>
            <span>Batch size</span>
            <strong>{model.batch_size ?? "n/a"}</strong>
          </div>
          <div className={sd.kv}>
            <span>Обучена</span>
            <strong>{model.trained_at ? formatDate(model.trained_at) : "ещё нет"}</strong>
          </div>
          <div className={sd.kv}>
            <span>Статус</span>
            <strong>
              {isDeployActive
                ? "активная"
                : isFailed
                  ? "ошибка обучения"
                  : isQueued
                    ? pendingLabel.toLowerCase()
                    : isBusy
                      ? "обучается"
                      : isTrained
                        ? "готова"
                        : "неактивная"}
            </strong>
          </div>
        </div>

        <div className={sd.card}>
          <div className={sd.blockTitle}>Метрики</div>
          {Object.entries(metricLabelMap).map(([key, label]) => (
            <div key={key} className={sd.kv}>
              <span>{label}</span>
              <strong>{formatMetric(model.metrics?.[key])}</strong>
            </div>
          ))}
        </div>
      </div>

      {(isQueued || isBusy) && (
        <div className={sd.card}>
          <div className={sd.blockTitle}>Состояние обучения</div>
          <div className={sd.kv}>
            <span>Этап</span>
            <strong>{isQueued ? pendingLabel : (model.training_stage ?? "В процессе")}</strong>
          </div>
          <div className={sd.kv}>
            <span>Прогресс</span>
            <strong>{model.training_status === "saving" ? "100%" : `${progress}%`}</strong>
          </div>
        </div>
      )}

      {isFailed && model.training_error && (
        <div className={sd.card}>
          <div className={sd.blockTitle}>Ошибка обучения</div>
          <div className={sd.emptyText}>{model.training_error}</div>
        </div>
      )}

      <div className={sd.card}>
        <div className={sd.blockTitle}>Классы модели</div>
        <div className={sd.classList}>
          {(model.class_names ?? []).length ? (
            model.class_names?.map((className) => (
              <span key={className} className={sd.classChip}>
                {className}
              </span>
            ))
          ) : (
            <span className={sd.emptyText}>Классы появятся после успешного обучения</span>
          )}
        </div>
      </div>
    </div>
  );
};
