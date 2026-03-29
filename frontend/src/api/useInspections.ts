import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runInspection } from "../api/inspections";
import { keys } from "../queryKeys";

export default function useInspections() {
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: runInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.inspections.all() }),
  });

  return { run };
}
