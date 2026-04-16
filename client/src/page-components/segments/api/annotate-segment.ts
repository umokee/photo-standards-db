import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig } from "@/lib/react-query";
import { SegmentClassWithPoints } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type AnnotateSegmentClassInput = {
  segmentClassId: string;
  imageId: string;
  points: number[][][];
};

export const annotateSegmentClass = ({
  segmentClassId,
  imageId,
  points,
}: AnnotateSegmentClassInput): Promise<SegmentClassWithPoints> => {
  return client.put(`/segment-classes/${segmentClassId}/annotations/${imageId}`, {
    points,
  });
};

type Options = {
  groupId: string;
  standardId: string;
  mutationConfig?: MutationConfig<typeof annotateSegmentClass>;
};

export const useAnnotateSegmentClass = ({ groupId, standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: annotateSegmentClass,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: queryKeys.standards.image(vars.imageId) });
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(standardId) });
      qc.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
