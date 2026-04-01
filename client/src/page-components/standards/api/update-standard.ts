import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { Angle, Standard } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getStandardQueryOptions } from "./get-standard";

export type UpdateStandardInput = {
  id: string;
  data: {
    name?: string;
    angle?: Angle;
  };
};

export const updateStandard = ({ id, data }: UpdateStandardInput): Promise<Standard> => {
  return client.put(`/standards/${id}`, data);
};

type UpdateStandardOptions = {
  mutationConfig?: MutationConfig<typeof updateStandard>;
};

export const useUpdateStandard = ({ mutationConfig }: UpdateStandardOptions = {}) => {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: updateStandard,
    onSuccess: (data, vars, ctx, mutation) => {
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: getStandardQueryOptions(vars.id).queryKey });
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Эталон успешно обновлен",
      });
      onSuccess?.(data, vars, ctx, mutation);
    },
    ...rest,
  });
};
