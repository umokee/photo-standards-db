import { InspectionMode, InspectionStatus } from "./shared";

export interface InspectionStartResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface InspectionDetectionBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InspectionDetection {
  confidence: number;
  bbox: InspectionDetectionBBox;
  polygon: number[][] | null;
}

export interface InspectionTaskSegmentDetail {
  segment_class_id: string | null;
  segment_class_group_id: string | null;
  class_key: string;
  name: string;
  hue: number | null;
  expected_count: number;
  detected_count: number;
  delta: number;
  status: "ok" | "less" | "more" | "extra";
  confidence: number | null;
  detections: InspectionDetection[];
}

export interface InspectionTaskResult {
  task_id: string;
  inspection_id: string | null;
  status: InspectionStatus;
  matched: number;
  total: number;
  missing: string[];
  details: InspectionTaskSegmentDetail[];
  mode: InspectionMode;
  model_name: string | null;
  debug?: {
    model_class_keys?: string[];
    raw_counts?: Record<string, number>;
    imgsz?: number;
  } | null;
}

export interface InspectionSaveResponse {
  inspection_id: string;
  status: InspectionStatus;
  message: string;
}

export interface InspectionResult {
  id: string;
  standard_id: string | null;
  model_id: string | null;
  camera_id: string | null;
  user_id: string | null;
  image_path: string;
  result_image_path: string | null;
  status: InspectionStatus;
  mode: InspectionMode;
  total_segments: number;
  matched_segments: number;
  serial_number: string | null;
  notes: string | null;
  inspected_at: string;
}
