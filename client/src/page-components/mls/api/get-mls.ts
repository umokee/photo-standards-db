import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MlModelListItem } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const getMls = (groupId: string): Promise<MlModelListItem[]> => {
  return client.get("/models", {
    params: { group_id: groupId },
  });
};

export const getMlsQueryOptions = (groupId: string) => {
  return queryOptions({
    queryKey: queryKeys.training.models(groupId),
    queryFn: () => getMls(groupId),
    enabled: !!groupId,
  });
};

export const useGetMls = (groupId: string | null) => {
  return useQuery({ ...getMlsQueryOptions(groupId!) });
};
