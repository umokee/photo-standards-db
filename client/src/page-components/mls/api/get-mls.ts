import { client } from "@/lib/api-client";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { MlModelListItem } from "../schemas";

export const getMls = (groupId: string): Promise<MlModelListItem[]> => {
  return client.get("/models", {
    params: { group_id: groupId },
  });
};

export const getMlsQueryOptions = (groupId: string) => {
  return queryOptions({
    queryKey: ["mls", groupId],
    queryFn: () => getMls(groupId),
    enabled: !!groupId,
  });
};

export const useGetMls = (groupId: string | null) => {
  return useQuery({ ...getMlsQueryOptions(groupId!) });
};

export const useGetMlsPolling = (groupId: string | null, refetchInterval = 5000) => {
  return useQuery({
    ...getMlsQueryOptions(groupId!),
    refetchInterval: groupId ? refetchInterval : false,
  });
};
