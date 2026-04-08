import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { StandardImage } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

type Options = {
  mutationConfig?: MutationConfig<typeof uploadImages>;
};

export const useUploadImages = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: uploadImages,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(vars.standardId) });
      notifySuccess("Изображения успешно загружены");
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
