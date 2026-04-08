import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { StandardDetail } from "@/types/contracts";
import { useQuery } from "@tanstack/react-query";

export const getStandard = (id: string): Promise<StandardDetail> => {
  return client.get(`/standards/${id}`);
};

export const getStandardQueryOptions = (id: string) => {
  return {
    queryKey: queryKeys.standards.detail(id),
    queryFn: () => getStandard(id),
    enabled: !!id,
  };
};

export const defaultStandard: StandardDetail = {
  id: "",
  group_id: "",
  name: "",
  angle: null,
  is_active: true,
  created_at: "",
  stats: {
    images_count: 0,
    annotated_images_count: 0,
    unannotated_images_count: 0,
    segments_count: 0,
    segment_groups_count: 0,
    reference_image_id: null,
    reference_path: null,
  },
  images: [],
  segments: [],
  segment_groups: [],
};

export const useGetStandardDetail = (id: string | null) => {
  return useQuery({ ...getStandardQueryOptions(id!) });
};
