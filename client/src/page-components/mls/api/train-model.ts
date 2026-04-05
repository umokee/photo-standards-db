import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGroupQueryOptions } from "@/page-components/groups/api/get-group";
import { getMlsQueryOptions } from "./get-mls";
import { getTrainingTasksQueryOptions } from "./get-training-tasks";
import { TrainModelInput, TrainingTaskItem } from "../schemas";

export const trainModel = (data: TrainModelInput): Promise<TrainingTaskItem> => {
  return client.post("/models/train", data);
};

type Options = {
  groupId: string;
  mutationConfig?: MutationConfig<typeof trainModel>;
};

export const useTrainModel = ({ groupId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: trainModel,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: getMlsQueryOptions(groupId).queryKey });
      qc.invalidateQueries({ queryKey: getTrainingTasksQueryOptions(groupId).queryKey });
      qc.invalidateQueries({ queryKey: getGroupQueryOptions(groupId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Обучение модели запущено",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
