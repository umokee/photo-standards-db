import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { StandardDetail } from "@/types/contracts";
import { useSuspenseQuery } from "@tanstack/react-query";

export const getStandard = (id: string): Promise<StandardDetail> => {
  return client.get(`/standards/${id}`);
};

export const getStandardQueryOptions = (id: string) => {
  return {
    queryKey: queryKeys.standards.detail(id),
    queryFn: () => getStandard(id),
  };
};

export const useGetStandardDetail = (id: string) => {
  return useSuspenseQuery(getStandardQueryOptions(id));
};
