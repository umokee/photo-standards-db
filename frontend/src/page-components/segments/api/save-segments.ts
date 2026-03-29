import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
import { StandardDetail } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type SaveSegmentsInput = {
  standardId: string;
  groups: {
    id?: string;
    name: string;
    hue: number;
    segments: {
      id?: string;
      label: string;
    }[];
  }[];
  deletedGroupIds: string[];
  deletedSegmentIds: string[];
};

export const saveSegments = ({ standardId, ...body }: SaveSegmentsInput): Promise<StandardDetail> =>
  client.put(`/standards/${standardId}/segments`, {
    groups: body.groups,
    deleted_group_ids: body.deletedGroupIds,
    deleted_segment_ids: body.deletedSegmentIds,
  });

type Options = {
  mutationConfig?: MutationConfig<typeof saveSegments>;
};

export const useSaveSegments = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: saveSegments,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(vars.standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Классы успешно сохранены",
      });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
