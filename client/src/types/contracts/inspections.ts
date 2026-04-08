import { InspectionMode, InspectionStatus } from "./shared";

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
