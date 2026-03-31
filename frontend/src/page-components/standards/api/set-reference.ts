import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { StandardImage } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getStandardQueryOptions } from "./get-standard";

export const setReference = (imageId: string): Promise<StandardImage> => {
  return client.patch(`/standards/images/${imageId}/reference`);
};

type Options = {
  standardId: string;
  mutationConfig?: MutationConfig<typeof setReference>;
};

export const useSetReference = ({ standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: setReference,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Изображение установлено как образец",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
