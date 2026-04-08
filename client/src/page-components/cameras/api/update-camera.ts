import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { Camera } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type UpdateCameraInput = {
  id: string;
  data: {
    name?: string;
    rtsp_url?: string;
    resolution?: string;
    location?: string;
  };
};

export const updateCamera = ({ id, data }: UpdateCameraInput): Promise<Camera> => {
  return client.put(`/cameras/${id}`, data);
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
      qc.invalidateQueries({ queryKey: queryKeys.cameras.all() });
      notifySuccess("Камера успешно обновлена");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
