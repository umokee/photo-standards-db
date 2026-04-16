import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { TaskResponse } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const getTask = (taskId: string): Promise<TaskResponse> => {
  return client.get(`/tasks/${taskId}`);
};

export const getTaskQueryOptions = (taskId: string) =>
  queryOptions({
    queryKey: queryKeys.training.task(taskId),
    queryFn: () => getTask(taskId),
    enabled: !!taskId,
  });

const isActiveTask = (status?: string | null) =>
  ["pending", "queued", "running"].includes(status ?? "");

export const useGetTask = (taskId: string | null) => {
  return useQuery({
    ...getTaskQueryOptions(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isActiveTask(status) ? 3000 : false;
    },
  });
};
