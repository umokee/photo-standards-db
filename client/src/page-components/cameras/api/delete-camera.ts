import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const deleteCamera = (id: string): Promise<void> => {
  return client.delete(`/cameras/${id}`);
};

type Options = {
  mutationConfig?: MutationConfig<typeof deleteCamera>;
};

export const useDeleteCamera = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};
  return useMutation({
    mutationFn: deleteCamera,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.cameras.all() });
      notifySuccess("Камера успешно удалена");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
