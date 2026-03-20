import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStandard, deleteStandard, updateStandard } from "../api/standards";

const GROUPS_KEY = ["groups"];
const standardKey = (id) => ["standards", id];

export default function useStandards(id) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: GROUPS_KEY });
    if (id) qc.invalidateQueries({ queryKey: standardKey(id) });
  };

  const create = useMutation({
    mutationFn: createStandard,
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: updateStandard,
    onSuccess: () => invalidate(),
  });

  const remove = useMutation({
    mutationFn: deleteStandard,
    onSuccess: () => invalidate(),
  });

  return {
    create,
    update,
    remove,
  };
}
