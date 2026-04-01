import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCamerasQueryOptions } from "./get-cameras";

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
      qc.invalidateQueries({ queryKey: getCamerasQueryOptions().queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Камера успешно удалена",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
