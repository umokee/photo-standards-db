import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import type { GroupMutationResponse } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type UpdateGroupInput = {
  id: string;
  data: {
    name?: string;
    description?: string;
  };
};

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
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      qc.invalidateQueries({ queryKey: queryKeys.groups.detail(vars.id) });
      notifySuccess("Группа успешно обновлена");
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
