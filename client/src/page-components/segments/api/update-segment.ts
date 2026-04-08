import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { Segment } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type UpdateSegmentInput = {
  id: string;
  data: {
    segmentGroupId?: string;
    name?: string;
  };
};

export const updateSegment = ({ id, data }: UpdateSegmentInput): Promise<Segment> => {
  return client.put(`/segments/${id}`, data);
};

type Options = {
  standardId: string;
  mutationConfig?: MutationConfig<typeof updateSegment>;
};

export const useUpdateSegment = ({ standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: updateSegment,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(standardId) });
      notifySuccess("Класс успешно обновлен");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
