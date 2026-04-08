import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { GroupDetail } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const getGroup = (id: string): Promise<GroupDetail> => {
  return client.get(`/groups/${id}`);
};

export const getGroupQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: queryKeys.groups.detail(id),
    queryFn: () => getGroup(id),
    enabled: !!id,
  });
};

export const defaultGroup: GroupDetail = {
  id: "",
  name: "",
  description: null,
  created_at: "",
  stats: {
    standards_count: 0,
    images_count: 0,
    annotated_count: 0,
    polygons_count: 0,
    segment_groups_count: 0,
    segments_count: 0,
    models_count: 0,
  },
  standards: [],
  active_model: null,
};

export const useGetGroup = (id: string | null) => {
  return useQuery({ ...getGroupQueryOptions(id!) });
};
