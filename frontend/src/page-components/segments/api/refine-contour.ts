import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { client } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { useMutation } from "@tanstack/react-query";

export type RefineContourInput = {
  imageId: string;
  points: number[][];
  epsilon?: number;
  padding?: number;
};

export const refineContour = async ({
  imageId,
  points,
  epsilon,
  padding,
}: RefineContourInput): Promise<{ points: number[][] }> => {
  return client.post(`/segments/refine`, {
    image_id: imageId,
    points,
    epsilon: epsilon ?? 2.0,
    padding: padding ?? 50,
  });
};

type Options = {
  mutationConfig?: MutationConfig<typeof refineContour>;
};

export const useRefineContour = ({ mutationConfig }: Options = {}) => {
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: refineContour,
    onSuccess: (...args) => {
      useNotificationStore.getState().addNotification({
        type: "success",
        message: "Контур полигона успешно уточнен",
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
};
