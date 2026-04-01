import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { getGroupsQueryOptions } from "@/page-components/groups/api/get-groups";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getStandardQueryOptions } from "./get-standard";

export const deleteStandard = (id: string): Promise<void> => {
  return client.delete(`/standards/${id}`);
};

type Options = {
  mutationConfig?: MutationConfig<typeof deleteStandard>;
};

export const useDeleteStandard = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: deleteStandard,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(vars).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Эталон успешно удален",
      });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
