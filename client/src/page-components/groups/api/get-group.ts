import { client } from "@/lib/api-client";
import { GroupDetail } from "@/types/api";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const getGroup = (id: string): Promise<GroupDetail> => {
  return client.get(`/groups/${id}`);
};

export const getGroupQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: ["group", id],
    queryFn: () => getGroup(id),
    enabled: !!id,
  });
};

export const deafultGroup: GroupDetail = {
  id: "",
  name: "",
  description: null,
  created_at: "",
  standards_count: 0,
  images_count: 0,
  standards: [],
};

export const useGetGroup = (id: string | null) => {
  return useQuery({ ...getGroupQueryOptions(id!) });
};
