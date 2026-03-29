import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGroupsQueryOptions } from "./get-groups";

export const deleteGroup = (id: string): Promise<void> => {
  return client.delete(`/groups/${id}`);
};

type Options = {
  mutationConfig?: MutationConfig<typeof deleteGroup>;
};

export const useDeleteGroup = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: getGroupsQueryOptions().queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Группа успешно удалена",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
