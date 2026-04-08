import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const deleteImage = (imageId: string): Promise<void> => {
  return client.delete(`/standards/images/${imageId}`);
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
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(standardId) });
      notifySuccess("Изображение успешно удалено");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
