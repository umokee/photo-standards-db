import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const deleteSegmentGroup = (id: string): Promise<void> => {
  return client.delete(`/segment-groups/${id}`);
};

type Options = {
  standardId: string;
  mutationConfig?: MutationConfig<typeof deleteSegmentGroup>;
};

export const useDeleteSegmentGroup = ({ standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: deleteSegmentGroup,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(standardId) });
      notifySuccess("Группа классов успешно удалена");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
