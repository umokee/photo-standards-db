import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSegmentGroup, deleteSegmentGroup, updateSegmentGroup } from "../api/segmentGroups";

const standardsKey = (id) => ["standards", id];

export default function useSegmentGroups(standardId) {
  const qc = useQueryClient();
  const invalidate = () => {
    if (standardId) qc.invalidateQueries({ queryKey: standardsKey(standardId) });
  };

  const create = useMutation({
    mutationFn: createSegmentGroup,
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: updateSegmentGroup,
    onSuccess: () => invalidate(),
  });

  const remove = useMutation({
    mutationFn: deleteSegmentGroup,
    onSuccess: () => invalidate(),
  });

  return { create, update, remove };
}
