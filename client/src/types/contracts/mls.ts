import { ACTIVE_TRAINING_STATUSES } from "@/constants";
import { Architecture, TrainingStatus } from "./shared";

export interface MlModel {
  id: string;
  group_id: string;
  name: string;
  architecture: Architecture | string;
  weights_path: string | null;
  version: number;
  epochs: number | null;
  imgsz: number;
  batch_size: number | null;
  num_classes: number | null;
  metrics: Record<string, number | null> | null;
  class_names: string[] | null;
  train_ratio: number | null;
  val_ratio: number | null;
  test_ratio: number | null;
  total_images: number | null;
  train_count: number | null;
  val_count: number | null;
  test_count: number | null;
  training_status: TrainingStatus | null;
  training_progress: number | null;
  training_stage: string | null;
  training_error: string | null;
  training_started_at: string | null;
  training_finished_at: string | null;
  is_active: boolean;
  trained_at: string | null;
  created_at: string;
}

export const isTraining = (model: MlModel): boolean =>
  model.training_status !== null && ACTIVE_TRAINING_STATUSES.includes(model.training_status);

export const isTrained = (model: MlModel): boolean => model.trained_at !== null;

export const isTrainingFailed = (model: MlModel): boolean => model.training_status === "failed";

export const getTrainingPercent = (model: MlModel): number => {
  if (model.training_status === "saving") return 100;
  if (model.training_progress === null || !model.epochs) return 0;
  return Math.min(100, Math.round((model.training_progress / model.epochs) * 100));
};
