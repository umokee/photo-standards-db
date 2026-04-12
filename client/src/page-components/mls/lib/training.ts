import { ACTIVE_TRAINING_STATUSES } from "@/constants";
import { MlModel } from "@/types/contracts";

export const isTrainingModel = (model: MlModel): boolean =>
  model.training_status !== null && ACTIVE_TRAINING_STATUSES.includes(model.training_status);

export const isTrainedModel = (model: MlModel): boolean => model.trained_at !== null;

export const isTrainingFailedModel = (model: MlModel): boolean =>
  model.training_status === "failed";


const getTrainingStatus = (model: MlModel): TrainingStatus =>
  model.training_status ?? (model.trained_at ? "done" : "pending");

export const getTrainingPercent = (model: MlModel): number => {
  if (model.training_status === "saving") return 100;
  if (model.training_progress === null || !model.epochs) return 0;
  return Math.min(100, Math.round((model.training_progress / model.epochs) * 100));
};
