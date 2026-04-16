import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const deleteGroup = (id: string): Promise<void> => {
  return client.delete(`/groups/${id}`);
};

type Options = {
  mutationConfig?: MutationConfig<typeof deleteGroup>;
};

export const useDeleteGroup = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: (...args) => {
      onSuccess?.(...args);
      qc.invalidateQueries({ queryKey: queryKeys.groups.all(), exact: true });
      notifySuccess("Группа успешно удалена");
    },
    ...rest,
  });
};
