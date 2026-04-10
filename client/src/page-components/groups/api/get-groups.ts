import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { GroupListItem } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const getGroups = (search?: string): Promise<GroupListItem[]> => {
  return client.get("/groups", { params: search ? { search } : undefined });
};

export const getGroupsQueryOptions = (search?: string) => {
  return queryOptions({
    queryKey: [...queryKeys.groups.all(), { search: search ?? "" }],
    queryFn: () => getGroups(search),
  });
};

export const useGetGroups = (search?: string) => {
  return useQuery(getGroupsQueryOptions(search));
};
