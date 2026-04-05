import { Angle } from "@/types/api";

export interface GroupStats {
  standards_count: number;
  images_count: number;
  annotated_count: number;
  polygons_count: number;
  segment_groups_count: number;
  segments_count: number;
  models_count: number;
}

export interface GroupStandardShort {
  id: string;
  group_id: string;
  name: string | null;
  angle: Angle | null;
  is_active: boolean;
  image_count: number;
  annotated_count: number;
  reference_path: string | null;
  created_at: string;
}

export interface GroupModelShort {
  id: string;
  group_id: string;
  name: string;
  architecture: string;
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

export interface GroupListItem {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  stats: GroupStats;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  stats: GroupStats;
  standards: GroupStandardShort[];
  active_model: GroupModelShort | null;
}

export interface GroupMutationResponse {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
}

export interface UpdateGroupInput {
  id: string;
  data: {
    name?: string;
    description?: string;
  };
}
