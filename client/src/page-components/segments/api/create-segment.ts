import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { Segment } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type CreateSegmentInput = {
  standardId: string;
  segmentGroupId: string;
  name: string;
};

export const createSegment = ({
  standardId,
  segmentGroupId,
  name,
}: CreateSegmentInput): Promise<Segment> => {
  return client.post("/segments", {
    standard_id: standardId,
    segment_group_id: segmentGroupId,
    name,
  });
};

type Options = {
  mutationConfig?: MutationConfig<typeof createSegment>;
};

export const useCreateSegment = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: createSegment,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(vars.standardId) });
      notifySuccess("Класс успешно создан");
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
