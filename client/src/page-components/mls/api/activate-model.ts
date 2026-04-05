import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGroupQueryOptions } from "@/page-components/groups/api/get-group";
import { getMlsQueryOptions } from "./get-mls";
import { MlModelListItem } from "../schemas";

export const activateModel = (modelId: string): Promise<MlModelListItem> => {
  return client.put(`/models/${modelId}/activate`);
};

type Options = {
  groupId: string;
  mutationConfig?: MutationConfig<typeof activateModel>;
};

export const useActivateModel = ({ groupId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: activateModel,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: getMlsQueryOptions(groupId).queryKey });
      qc.invalidateQueries({ queryKey: getGroupQueryOptions(groupId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Модель активирована",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
