import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
import { SegmentGroup } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type CreateSegmentGroupInput = {
  standardId: string;
  name: string;
  hue: number;
};

export const createSegmentGroup = ({
  standardId: standard_id,
  name,
  hue,
}: CreateSegmentGroupInput): Promise<SegmentGroup> => {
  return client.post("/segment-groups", { standard_id, name, hue });
};

type Options = {
  mutationConfig?: MutationConfig<typeof createSegmentGroup>;
};

export const useCreateSegmentGroup = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: createSegmentGroup,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(vars.standardId).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Группа классов успешно создана",
      });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
