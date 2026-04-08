import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import type { GroupMutationResponse } from "@/types/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type CreateGroupInput = {
  name: string;
  description?: string;
};

export const createGroup = (data: CreateGroupInput): Promise<GroupMutationResponse> => {
  return client.post("/groups", data);
};

type Options = {
  mutationConfig?: MutationConfig<typeof createGroup>;
};

export const useCreateGroup = ({ mutationConfig }: Options = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: createGroup,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      notifySuccess("Группа успешно создана");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
