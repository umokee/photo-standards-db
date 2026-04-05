import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateGroupInput, GroupMutationResponse } from "../schemas";
import { getGroupsQueryOptions } from "./get-groups";

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
      qc.invalidateQueries({ queryKey: getGroupsQueryOptions().queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Группа успешно создана",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
