import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GroupMutationResponse, UpdateGroupInput } from "../schemas";
import { getGroupQueryOptions } from "./get-group";
import { getGroupsQueryOptions } from "./get-groups";

export const updateGroup = ({ id, data }: UpdateGroupInput): Promise<GroupMutationResponse> => {
  return client.put(`/groups/${id}`, data);
};

type Options = {
  mutationConfig?: MutationConfig<typeof updateGroup>;
};

export const useUpdateGroup = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: updateGroup,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: getGroupsQueryOptions().queryKey });
      qc.invalidateQueries({ queryKey: getGroupQueryOptions(vars.id).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Группа успешно обновлена",
      });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
