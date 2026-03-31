import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import type { Camera } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCamerasQueryOptions } from "./get-cameras";

export type UpdateCameraInput = {
  id: string;
  name: string;
  rtspUrl: string;
  resolution: string;
  location: string;
};

export const updateCamera = ({
  id,
  name,
  rtspUrl: rtsp_url,
  resolution,
  location,
}: UpdateCameraInput): Promise<Camera> => {
  return client.put(`/cameras/${id}`, { name, rtsp_url, resolution, location });
};

type Options = {
  mutationConfig?: MutationConfig<typeof updateCamera>;
};

export const useUpdateCamera = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};
  return useMutation({
    mutationFn: updateCamera,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: getCamerasQueryOptions().queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Камера успешно обновлена",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
