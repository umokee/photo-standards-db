import { client } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { TrainingTaskItem } from "../schemas";

export const getTrainingTasks = (groupId: string): Promise<TrainingTaskItem[]> => {
  return client.get("/models/tasks", {
    params: { group_id: groupId },
  });
};

export const getTrainingTasksQueryOptions = (groupId: string) => {
  return {
    queryKey: ["training-tasks", groupId],
    queryFn: () => getTrainingTasks(groupId),
    enabled: !!groupId,
  };
};

export const useGetTrainingTasks = (groupId: string | null, refetchInterval = 5000) => {
  return useQuery({
    ...getTrainingTasksQueryOptions(groupId!),
    refetchInterval: groupId ? refetchInterval : false,
  });
};
