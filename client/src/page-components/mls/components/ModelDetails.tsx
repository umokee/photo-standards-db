import { SectionHeader } from "@/components/layouts/section-header/section-header";
import Button from "@/components/ui/button/button";
import ProgressBar from "@/components/ui/progress-bar/progress-bar";
import { GroupDetail, MlModelListItem, TrainingTaskItem } from "@/types/contracts";
import { formatDate } from "@/utils/formatDate";
import { AlertCircle, CheckCircle2, Clock3, Cpu, Sparkles } from "lucide-react";
import s from "./model-details.module.scss";

interface Props {
  group: GroupDetail;
  model: MlModelListItem | null;
  task?: TrainingTaskItem | null;
  pendingLabel?: string;
  onActivate?: () => void;
  isActivating?: boolean;
}

const metricLabelMap: Record<string, string> = {
  mAP50: "mAP50",
  mAP50_95: "mAP50-95",
  precision: "Precision",
  recall: "Recall",
};

const formatMetric = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "n/a";
  return value.toFixed(3);
};

export default function ModelDetails({
  group,
  model,
  task,
  pendingLabel = "В очереди",
  onActivate,
  isActivating,
}: Props) {
  if (!model) {
    return (
      <div className={s.empty}>
        <Sparkles size={18} />
        <span>Выберите модель или запустите первое обучение</span>
      </div>
    );
  }

  const isTrained = !!model.trained_at;
  const isDeployActive = model.is_active && isTrained;
  const isQueued = task?.status === "pending";
  const isBusy = task && ["preparing", "training", "saving"].includes(task.status);
  const isFailed = task?.status === "failed";
  const canActivate = !!onActivate && !isActivating;

  return (
    <div className={s.root}>
      <SectionHeader bordered>
        <SectionHeader.Title>Модель</SectionHeader.Title>
        <SectionHeader.Side>
          {isDeployActive ? (
            <span className={s.activeBadge}>
              <CheckCircle2 size={14} />
              Активна
            </span>
          ) : isQueued ? (
            <span className={s.queueBadge}>
              <Clock3 size={14} />
              {pendingLabel}
            </span>
          ) : isBusy ? (
            <span className={s.busyBadge}>
              <Cpu size={14} />
              Обучается
            </span>
          ) : isFailed ? (
            <span className={s.queueBadge}>
              <AlertCircle size={14} />
              Ошибка
            </span>
          ) : (
            <Button variant="ml" size="sm" disabled={!canActivate} onClick={onActivate}>
              Активировать
            </Button>
          )}
        </SectionHeader.Side>
      </SectionHeader>

      <div className={s.hero}>
        <div>
          <div className={s.name}>{model.name}</div>
          <div className={s.meta}>
            {model.architecture} · v{model.version} · {formatDate(model.created_at)}
          </div>
        </div>
        <div className={s.metricsPreview}>
          <div>
            <span>Классов</span>
            <strong>{model.num_classes ?? group.stats.segment_groups_count}</strong>
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

      <div className={s.standards}>
        <div className={s.blockTitle}>Покрытие эталонов</div>
        <div className={s.standardList}>
          {group.standards.map((standard) => (
            <div key={standard.id} className={s.standardRow}>
              <span className={s.standardName}>{standard.name ?? "Без названия"}</span>
              <ProgressBar
                value={standard.annotated_images_count}
                max={standard.images_count}
                warn={standard.annotated_images_count < standard.images_count}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={s.grid}>
        <div className={s.card}>
          <div className={s.blockTitle}>Параметры</div>
          <div className={s.kv}>
            <span>Batch size</span>
            <strong>{model.batch_size ?? "n/a"}</strong>
          </div>
          <div className={s.kv}>
            <span>Обучена</span>
            <strong>{model.trained_at ? formatDate(model.trained_at) : "ещё нет"}</strong>
          </div>
          <div className={s.kv}>
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
                      : "неактивная"}
            </strong>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.blockTitle}>Метрики</div>
          {Object.entries(metricLabelMap).map(([key, label]) => (
            <div key={key} className={s.kv}>
              <span>{label}</span>
              <strong>{formatMetric(model.metrics?.[key])}</strong>
            </div>
          ))}
        </div>
      </div>

      {isFailed && task?.error && (
        <div className={s.card}>
          <div className={s.blockTitle}>Ошибка обучения</div>
          <div className={s.emptyText}>{task.error}</div>
        </div>
      )}

      <div className={s.card}>
        <div className={s.blockTitle}>Классы модели</div>
        <div className={s.classList}>
          {(model.class_names ?? []).length ? (
            model.class_names?.map((className) => (
              <span key={className} className={s.classChip}>
                {className}
              </span>
            ))
          ) : (
            <span className={s.emptyText}>Классы появятся после успешного обучения</span>
          )}
        </div>
      </div>
    </div>
  );
}
