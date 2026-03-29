import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { getImageQueryOptions } from "@/page-components/standards/api/get-image";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
import { SegmentWithPoints } from "@/types/api";
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
  standardId: string;
  mutationConfig?: MutationConfig<typeof annotateSegment>;
};

export const useAnnotateSegment = ({ standardId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: annotateSegment,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: getImageQueryOptions(vars.imageId).queryKey });
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(standardId).queryKey });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
