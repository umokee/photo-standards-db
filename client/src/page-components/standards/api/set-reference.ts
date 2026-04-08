import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { StandardImage } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(standardId) });
      notifySuccess("Изображение установлено как образец");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
