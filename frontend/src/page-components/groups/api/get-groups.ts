import { client } from "@/lib/api-client";
import { Group } from "@/types/api";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const getGroups = (): Promise<Group[]> => {
  return client.get("/groups");
};

export const getGroupsQueryOptions = () => {
  return queryOptions({
    queryKey: ["group", "all"],
    queryFn: getGroups,
  });
};

export const useGetGroups = () => {
  return useQuery({ ...getGroupsQueryOptions() });
};
