import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { SegmentGroup } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type UpdateSegmentGroupInput = {
  id: string;
  data: {
    name?: string;
    hue?: number;
  };
};

export const updateSegmentGroup = ({
  id,
  data,
}: UpdateSegmentGroupInput): Promise<SegmentGroup> => {
  return client.put(`/segment-groups/${id}`, data);
};

type Options = {
  standardId: string;
  mutationConfig?: MutationConfig<typeof updateSegmentGroup>;
};

export const useUpdateSegmentGroup = ({ standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: updateSegmentGroup,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(standardId) });
      notifySuccess("Группа классов успешно обновлена");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
