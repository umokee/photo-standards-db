import { ACTIVE_TRAINING_STATUSES } from "@/constants";
import { MlModel, TrainingStatus } from "@/types/contracts";

export const getTrainingStatus = (model: MlModel): TrainingStatus =>
  model.training_status ?? (model.trained_at ? "done" : "pending");

export const isTrainingModel = (model: MlModel): boolean =>
  ACTIVE_TRAINING_STATUSES.includes(getTrainingStatus(model));

export const isTrainedModel = (model: MlModel): boolean => model.trained_at !== null;

export const isTrainingFailedModel = (model: MlModel): boolean =>
  getTrainingStatus(model) === "failed";

export const getTrainingPercent = (model: MlModel): number => {
  if (model.training_status === "saving") return 100;
  if (model.training_progress === null || !model.epochs) return 0;
  return Math.min(100, Math.round((model.training_progress / model.epochs) * 100));
};
