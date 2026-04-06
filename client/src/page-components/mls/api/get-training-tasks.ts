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

const ACTIVE_STATUSES = ["pending", "preparing", "training", "saving"];

const hasActiveTasks = (tasks: TrainingTaskItem[] | undefined): boolean => {
  return tasks?.some((t) => ACTIVE_STATUSES.includes(t.status)) ?? false;
};

export const useGetTrainingTasks = (groupId: string | null) => {
  return useQuery({
    ...getTrainingTasksQueryOptions(groupId!),
    refetchInterval: (query) => {
      return hasActiveTasks(query.state.data) ? 3000 : false;
    },
  });
};
