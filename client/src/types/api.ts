export type Angle = "front" | "top" | "left" | "right" | "back";
export type UserRole = "operator" | "inspector" | "admin";
export type InspectionStatus = "passed" | "failed";
export type InspectionMode = "photo" | "snapshot" | "realtime";
export type Architecture =
  | "yolov26n-seg"
  | "yolov26s-seg"
  | "yolov26m-seg"
  | "yolov26l-seg"
  | "yolov26x-seg";

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface InspectionSegmentDetail {
  segment_group_id: string | null;
  name: string;
  is_found: boolean;
  found: boolean;
  confidence: number;
}

export interface InspectionRunResult {
  inspection_id: string;
  status: InspectionStatus;
  matched: number;
  total: number;
  missing: string[];
  details: InspectionSegmentDetail[];
  mode: InspectionMode;
  model_name: string | null;
}

export interface InspectionResult {
  id: string;
  standard_id: string | null;
  model_id: string | null;
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

export interface InspectionDetail extends InspectionResult {
  segment_results: InspectionSegmentDetail[];
}

export interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  resolution: string | null;
  location: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

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

export interface SegmentGroup {
  id: string;
  standard_id: string;
  name: string;
  hue: number;
  segment_count: number;
}

export interface Segment {
  id: string;
  segment_group_id: string | null;
  name: string;
}

export interface SegmentWithPoints extends Segment {
  points: number[][][];
}

export interface StandardImage {
  id: string;
  image_path: string;
  is_reference: boolean;
  annotation_count: number;
  created_at: string;
}

export interface StandardImageDetail extends StandardImage {
  segments: SegmentWithPoints[];
}

export interface Standard {
  id: string;
  group_id: string;
  name: string;
  angle: Angle | null;
  is_active: boolean;
  image_count: number;
  annotated_count: number;
  reference_path: string | null;
  image_path: string | null;
  segment_groups: SegmentGroup[];
  created_at: string;
}

export interface StandardDetail {
  id: string;
  group_id: string;
  name: string | null;
  angle: Angle | null;
  is_active: boolean;
  created_at: string;
  images: StandardImageDetail[];
  segments: Segment[];
  segment_groups: SegmentGroup[];
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  standards_count: number;
  images_count: number;
}

export interface GroupDetail extends Group {
  standards: Standard[];
  active_model: MlModel | null;
}
