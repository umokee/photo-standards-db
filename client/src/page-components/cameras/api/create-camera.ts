import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { Camera } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
      qc.invalidateQueries({ queryKey: queryKeys.cameras.all() });
      notifySuccess("Камера успешно создана");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
