import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
import type { SegmentGroup } from "@/types/api";
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
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Группа классов успешно обновлена",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
