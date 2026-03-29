import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
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
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Группа классов успешно удалена",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
