import { Architecture } from "./shared";

export interface MlModelClassMeta {
  id: string;
  key: string;
  name: string;
  index: number;
  class_group_id: string | null;
}

export interface MlModel {
  id: string;
  group_id: string;

  architecture: Architecture;
  weights_path: string | null;
  version: number | null;

  epochs: number | null;
  imgsz: number;
  batch_size: number | null;

  num_classes: number | null;
  class_keys: string[] | null;
  class_meta: MlModelClassMeta[] | null;
  metrics: Record<string, number | null> | null;

  train_ratio: number | null;
  val_ratio: number | null;
  test_ratio: number | null;

  total_images: number | null;
  train_count: number | null;
  val_count: number | null;
  test_count: number | null;

  is_active: boolean;
  trained_at: string | null;
  created_at: string;
}
