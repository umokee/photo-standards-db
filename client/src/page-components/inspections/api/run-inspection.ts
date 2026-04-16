import { client } from "@/lib/api-client";
import { notifySuccess, type MutationConfig } from "@/lib/react-query";
import { InspectionStartResponse } from "@/types/contracts";
import { useMutation } from "@tanstack/react-query";

export interface RunInspectionInput {
  standard_id: string;
  selected_segment_class_ids: string[];
  mode: string;
  image: File;
  camera_id?: string | null;
  serial_number?: string | null;
  notes?: string | null;
}

export const runInspection = async (
  input: RunInspectionInput
): Promise<InspectionStartResponse> => {
  const formData = new FormData();

  formData.append("standard_id", input.standard_id);
  formData.append("mode", input.mode);
  formData.append("image", input.image);

  input.selected_segment_class_ids.forEach((id) => {
    formData.append("selected_segment_class_ids", id);
  });

  if (input.camera_id) {
    formData.append("camera_id", input.camera_id);
  }

  if (input.serial_number) {
    formData.append("serial_number", input.serial_number);
  }

  if (input.notes) {
    formData.append("notes", input.notes);
  }

  return client.post("/inspections/run", formData);
};

type Options = {
  mutationConfig?: MutationConfig<typeof runInspection>;
};

export const useRunInspection = ({ mutationConfig }: Options = {}) => {
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    mutationFn: runInspection,
    onSuccess: (...args) => {
      notifySuccess("Проверка запущена");
      onSuccess?.(...args);
    },
    ...rest,
  });
};
