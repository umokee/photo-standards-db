import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { Architecture, MlModel } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface TrainModelInput {
  group_id: string;
  architecture: Architecture;
  train_ratio: number;
  val_ratio: number;
  epochs: number;
  imgsz: number;
  batch_size: number;
}

export const trainModel = (data: TrainModelInput): Promise<MlModel> => {
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
      qc.invalidateQueries({ queryKey: queryKeys.training.models(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
      notifySuccess("Обучение модели запущено");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
