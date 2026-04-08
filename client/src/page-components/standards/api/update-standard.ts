import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { Angle, StandardMutationResponse } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type UpdateStandardInput = {
  id: string;
  data: {
    name?: string;
    angle?: Angle;
  };
};

export const updateStandard = ({
  id,
  data,
}: UpdateStandardInput): Promise<StandardMutationResponse> => {
  return client.put(`/standards/${id}`, data);
};

type Options = {
  mutationConfig?: MutationConfig<typeof updateStandard>;
};

export const useUpdateStandard = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: updateStandard,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(vars.id) });
      notifySuccess("Эталон успешно обновлен");
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
