import { MlModel, TaskResponse, TrainingStatus } from "@/types/contracts";

const ACTIVE_TRAINING_STATUSES = new Set<TrainingStatus>([
  "pending",
  "preparing",
  "training",
  "saving",
]);

export const getModelTask = (model: MlModel, tasks: TaskResponse[]): TaskResponse | null => {
  return (
    tasks.find((task) => task.entity_type === "ml_model" && task.entity_id === model.id) ?? null
  );
};

export const getTrainingStatus = (model: MlModel, task: TaskResponse | null): TrainingStatus => {
  if (task) {
    if (task.status === "pending" || task.status === "queued") return "pending";

    if (task.status === "running") {
      const stage = task.stage?.toLowerCase() ?? "";

      if (stage.includes("подготов")) return "preparing";
      if (stage.includes("сохран")) return "saving";

      return "training";
    }

    if (task.status === "failed" || task.status === "cancelled") return "failed";
    if (task.status === "succeeded") return "done";
  }

  return model.trained_at ? "done" : "pending";
};

export const getTrainingPercent = (model: MlModel, task: TaskResponse | null): number => {
  if (!task) return model.trained_at ? 100 : 0;
  if (task.progress_percent != null) return task.progress_percent;

  if (task.progress_current != null && model.epochs && model.epochs > 0) {
    return Math.min(100, Math.round((task.progress_current / model.epochs) * 100));
  }

  if (task.status === "succeeded") return 100;

  return 0;
};

export const isTrainingModel = (model: MlModel, task: TaskResponse | null): boolean => {
  return ACTIVE_TRAINING_STATUSES.has(getTrainingStatus(model, task));
};

export const isTrainedModel = (model: MlModel): boolean => {
  return !!model.trained_at;
};

export const isTrainingFailedModel = (model: MlModel, task: TaskResponse | null): boolean => {
  return getTrainingStatus(model, task) === "failed";
};
