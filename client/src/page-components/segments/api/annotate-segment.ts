import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig } from "@/lib/react-query";
import { SegmentWithPoints } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type AnnotateSegmentInput = {
  segmentId: string;
  imageId: string;
  points: number[][][];
};

export const annotateSegment = ({
  segmentId,
  imageId,
  points,
}: AnnotateSegmentInput): Promise<SegmentWithPoints> => {
  return client.put(`/segments/${segmentId}/annotations/${imageId}`, { points });
};

type Options = {
  groupId: string;
  standardId: string;
  mutationConfig?: MutationConfig<typeof annotateSegment>;
};

export const useAnnotateSegment = ({ groupId, standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: annotateSegment,
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
