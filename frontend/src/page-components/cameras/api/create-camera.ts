import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { Camera } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCamerasQueryOptions } from "./get-cameras";

export type CreateCameraInput = {
  name: string;
  rtspUrl: string;
  resolution?: string;
  location?: string;
};

export const createCamera = ({
  name,
  rtspUrl,
  resolution,
  location,
}: CreateCameraInput): Promise<Camera> => {
  return client.post("/cameras", {
    name,
    rtsp_url: rtspUrl,
    resolution: resolution || null,
    location: location || null,
  });
};

type Options = {
  mutationConfig?: MutationConfig<typeof createCamera>;
};

export const useCreateCamera = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: createCamera,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: getCamerasQueryOptions().queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Камера успешно создана",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
