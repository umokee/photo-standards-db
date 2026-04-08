import { Architecture, TrainingStatus } from "./shared";

export interface MlModel {
  id: string;
  group_id: string;
  name: string;
  architecture: Architecture | string;
  version: number;
  epochs: number | null;
  imgsz: number;
  batch_size: number | null;
  num_classes: number | null;
  metrics: Record<string, unknown> | null;
  class_names: string[] | null;
  is_active: boolean;
  trained_at: string | null;
  created_at: string;
}

export interface MlModelListItem {
  id: string;
  group_id: string;
  name: string;
  architecture: string;
  version: number;
  epochs: number | null;
  imgsz: number;
  batch_size: number | null;
  num_classes: number | null;
  metrics: Record<string, number | null> | null;
  class_names: string[] | null;
  is_active: boolean;
  trained_at: string | null;
  created_at: string;
}

export interface TrainingTaskItem {
  id: string;
  group_id: string;
  model_id: string | null;
  status: TrainingStatus;
  progress: number | null;
  stage: string | null;
  error: string | null;
  train_ratio: number | null;
  val_ratio: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

