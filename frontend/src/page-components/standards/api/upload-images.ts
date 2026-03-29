import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import type { StandardImage } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getStandardQueryOptions } from "./get-standard";

export type UploadImagesInput = {
  standardId: string;
  images: File[];
};

export const uploadImages = ({
  standardId,
  images,
}: UploadImagesInput): Promise<StandardImage[]> => {
  const form = new FormData();
  images.forEach((image) => form.append("images", image));
  return client.post(`/standards/${standardId}/images`, form);
};

type UseUploadImagesOptions = {
  mutationConfig?: MutationConfig<typeof uploadImages>;
};

export const useUploadImages = ({ mutationConfig }: UseUploadImagesOptions = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: uploadImages,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(vars.standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Изображения успешно загружены",
      });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
