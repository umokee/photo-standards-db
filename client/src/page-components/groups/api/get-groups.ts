import { client } from "@/lib/api-client";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { GroupListItem } from "../schemas";

export const getGroups = (): Promise<GroupListItem[]> => {
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
