import { client } from "@/lib/api-client";
import { StandardDetail } from "@/types/api";
import { useQuery } from "@tanstack/react-query";

export const getStandard = (id: string): Promise<StandardDetail> => {
  return client.get(`/standards/${id}`);
};

export const getStandardQueryOptions = (id: string) => {
  return {
    queryKey: ["standard", id],
    queryFn: () => getStandard(id),
    enabled: !!id,
  };
};

export const deafultStandard: StandardDetail = {
  id: "",
  group_id: "",
  name: null,
  angle: null,
  is_active: true,
  created_at: "",
  images: [],
  segments: [],
  segment_groups: [],
};

export const useGetStandardDetail = (id: string | null) => {
  return useQuery({ ...getStandardQueryOptions(id!) });
};
