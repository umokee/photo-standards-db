import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MlModel } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getMlsQueryOptions } from "./get-mls";

export const getMl = (modelId: string): Promise<MlModel> => {
  return client.get(`/models/${modelId}`);
};

export const getMlQueryOptions = (modelId: string) => {
  return queryOptions({
    queryKey: queryKeys.training.model(modelId),
    queryFn: () => getMl(modelId),
    enabled: !!modelId,
  });
};

export const useGetMl = (modelId: string | null, groupId: string | null) => {
  return useQuery({
    ...getMlsQueryOptions(groupId),
    select: (models) => models.find((m) => m.id === modelId) ?? null,
    enabled: !!modelId && !!groupId,
  });
};
