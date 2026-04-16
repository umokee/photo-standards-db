import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { TaskResponse } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";

type GetTasksParams = {
  groupId: string;
  type?: string;
};

export const getTasks = ({
  groupId,
  type = "model_training",
}: GetTasksParams): Promise<TaskResponse[]> => {
  return client.get("/tasks", {
    params: {
      group_id: groupId,
      type,
    },
  });
};

export const getTasksQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: queryKeys.training.tasks(groupId),
    queryFn: () => getTasks({ groupId }),
  });

const hasActiveTasks = (tasks?: TaskResponse[]) =>
  (tasks ?? []).some((task) => ["pending", "queued", "running"].includes(task.status));

export const useGetTasks = (groupId: string) => {
  return useQuery({
    ...getTasksQueryOptions(groupId),
    refetchInterval: (query) => {
      return hasActiveTasks(query.state.data) ? 3000 : false;
    },
  });
};
