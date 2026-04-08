import { client } from "@/lib/api-client";
import { MutationConfig, notifySuccess } from "@/lib/react-query";
import { useMutation } from "@tanstack/react-query";

export type RefineContourInput = {
  imageId: string;
  points: number[][];
};

export const refineContour = async ({
  imageId,
  points,
}: RefineContourInput): Promise<{ points: number[][] }> => {
  return client.post(`/segments/refine`, {
    image_id: imageId,
    points,
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
      notifySuccess("Контур полигона успешно уточнен");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
