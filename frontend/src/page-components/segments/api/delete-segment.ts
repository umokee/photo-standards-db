import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
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
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Класс успешно удален",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
