import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
import { Segment } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type UpdateSegmentInput = {
  id: string;
  segmentGroupId?: string;
  label?: string;
};

export const updateSegment = ({ id, ...body }: UpdateSegmentInput): Promise<Segment> => {
  return client.put(`/segments/${id}`, body);
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
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Класс успешно обновлен",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
