import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { SaveSegmentsResponse } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type SaveSegmentsInput = {
  standardId: string;
  groups: {
    id?: string;
    name: string;
    hue: number;
    segments: {
      id?: string;
      name: string;
    }[];
  }[];
  deletedGroupIds: string[];
  deletedSegmentIds: string[];
};

export const saveSegments = ({
  standardId,
  ...body
}: SaveSegmentsInput): Promise<SaveSegmentsResponse> =>
  client.put(`/segments/${standardId}/segments`, {
    groups: body.groups,
    deleted_group_ids: body.deletedGroupIds,
    deleted_segment_ids: body.deletedSegmentIds,
  });

type Options = {
  imageId: string;
  groupId: string;
  mutationConfig?: MutationConfig<typeof saveSegments>;
};

export const useSaveSegments = ({ imageId, groupId, mutationConfig }: Options) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: saveSegments,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(vars.standardId) });
      qc.invalidateQueries({ queryKey: queryKeys.standards.image(imageId) });
      qc.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      notifySuccess("Классы успешно сохранены");
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
