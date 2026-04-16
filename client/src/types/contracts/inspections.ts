import { InspectionMode, InspectionStatus } from "./shared";

export interface InspectionStartResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface InspectionTaskSegmentDetail {
  segment_id: string;
  segment_group_id: string | null;
  name: string;
  expected_count: number;
  detected_count: number;
  delta: number;
  status: string;
  confidence: number | null;
  detections: Record<string, unknown>[];
}

export interface InspectionTaskResult {
  inspection_id: string;
  status: InspectionStatus;
  matched: number;
  total: number;
  missing: string[];
  details: InspectionTaskSegmentDetail[];
  mode: InspectionMode;
  model_name: string | null;
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
