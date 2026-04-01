import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { getGroupQueryOptions } from "@/page-components/groups/api/get-group";
import { getGroupsQueryOptions } from "@/page-components/groups/api/get-groups";
import { Angle, Standard } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type CreateStandardInput = {
  groupId: string;
  name: string;
  angle?: Angle;
};

export const createStandard = ({
  groupId,
  name,
  angle,
}: CreateStandardInput): Promise<Standard> => {
  return client.post(`/standards`, { group_id: groupId, name, angle });
};

type Options = {
  mutationConfig?: MutationConfig<typeof createStandard>;
};

export const useCreateStandard = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: createStandard,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: getGroupsQueryOptions().queryKey });
      qc.invalidateQueries({ queryKey: getGroupQueryOptions(vars.groupId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Эталон успешно создан",
      });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
