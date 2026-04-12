import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MlModel } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { isTrainingModel } from "../lib/training";

export const getMls = (groupId: string): Promise<MlModel[]> => {
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
  return useQuery({
    ...getMlsQueryOptions(groupId!),
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some(isTrainingModel) ?? false;
      return hasActive ? 3000 : false;
    },
  });
};
