import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runInspection } from "../api/inspections";

export default function useInspections() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["inspections"] });
  };

  const run = useMutation({
    mutationFn: runInspection,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  return {
    run,
  };
}
