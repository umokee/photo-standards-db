import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getStandardQueryOptions } from "./get-standard";

export const deleteImage = (imageId: string): Promise<void> => {
  return client.delete(`/images/${imageId}`);
};

type Options = {
  standardId: string;
  mutationConfig?: MutationConfig<typeof deleteImage>;
};

export const useDeleteImage = ({ standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: deleteImage,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Изображение успешно удалено",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
