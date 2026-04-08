import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(vars) });
      notifySuccess("Эталон успешно удален");
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
