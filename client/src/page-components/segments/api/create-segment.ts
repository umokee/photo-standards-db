import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
import { Segment } from "@/types/api";
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
    segment_group_id: segmentGroupId || null,
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
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(vars.standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Класс успешно создан",
      });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
