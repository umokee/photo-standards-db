export interface SegmentGroup {
  id: string;
  standard_id: string;
  name: string;
  hue: number;
  segment_count: number;
}

export interface Segment {
  id: string;
  standard_id: string;
  segment_group_id: string;
  name: string;
}

export interface SegmentWithPoints extends Segment {
  points: number[][][];
}

export interface SaveSegmentsResponse {
  standard_id: string;
  groups: SegmentGroup[];
  segments: Segment[];
}
