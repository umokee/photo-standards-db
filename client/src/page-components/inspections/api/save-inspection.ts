import { client } from "@/lib/api-client";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { InspectionSaveResponse } from "@/types/contracts";
import { useMutation } from "@tanstack/react-query";

export interface SaveInspectionInput {
  task_id: string;
  serial_number?: string | null;
  notes?: string | null;
}

export const saveInspection = async (
  input: SaveInspectionInput
): Promise<InspectionSaveResponse> => {
  return client.post("/inspections/save", input);
};

type Options = {
  mutationConfig?: MutationConfig<typeof saveInspection>;
};

export const useSaveInspection = ({ mutationConfig }: Options = {}) => {
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: saveInspection,
    onSuccess: (...args) => {
      notifySuccess("Результат проверки сохранён");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
