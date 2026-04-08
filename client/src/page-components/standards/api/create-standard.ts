import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { Angle, StandardMutationResponse } from "@/types/contracts";
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
}: CreateStandardInput): Promise<StandardMutationResponse> => {
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
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      qc.invalidateQueries({ queryKey: queryKeys.groups.detail(vars.groupId) });
      notifySuccess("Эталон успешно создан");
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
