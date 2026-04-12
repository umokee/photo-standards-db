import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { isTraining, MlModel } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";

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

export const useGetMl = (modelId: string | null) => {
  return useQuery({
    ...getMlQueryOptions(modelId!),
    enabled: !!modelId,
    refetchInterval: (query) => {
      const model = query.state.data;
      return model && isTraining(model) ? 3000 : false;
    },
  });
};
