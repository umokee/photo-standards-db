import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const deleteSegment = (id: string): Promise<void> => {
  return client.delete(`/segments/${id}`);
};

type Options = {
  standardId: string;
  mutationConfig?: MutationConfig<typeof deleteSegment>;
};

export const useDeleteSegment = ({ standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: deleteSegment,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(standardId) });
      notifySuccess("Класс успешно удален");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
