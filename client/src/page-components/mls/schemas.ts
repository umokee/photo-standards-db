export type MlArchitecture =
  | "yolov26n-seg"
  | "yolov26s-seg"
  | "yolov26m-seg"
  | "yolov26l-seg"
  | "yolov26x-seg";

export type TrainingStatus = "pending" | "preparing" | "training" | "saving" | "done" | "failed";

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

export interface TrainModelInput {
  group_id: string;
  architecture: MlArchitecture;
  train_ratio: number;
  val_ratio: number;
  epochs: number;
  imgsz: number;
  batch_size: number;
}
