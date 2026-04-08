import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { SegmentGroup } from "@/types/contracts";
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
      qc.invalidateQueries({ queryKey: queryKeys.standards.detail(vars.standardId) });
      notifySuccess("Группа классов успешно создана");
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
