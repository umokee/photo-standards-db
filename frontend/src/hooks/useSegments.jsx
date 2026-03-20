import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSegment, deleteSegment, updateSegment } from "../api/segments";

const GROUPS_KEY = ["groups"];
const standardKey = (id) => ["standards", id];
const imageKey = (id) => ["images", id];

export default function useSegments(imageId, standardId) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: GROUPS_KEY });
    if (imageId) qc.invalidateQueries({ queryKey: imageKey(imageId) });
    if (standardId) qc.invalidateQueries({ queryKey: standardKey(standardId) });
  };

  const create = useMutation({
    mutationFn: createSegment,
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: updateSegment,
    onSuccess: () => invalidate(),
  });

  const remove = useMutation({
    mutationFn: deleteSegment,
    onSuccess: () => invalidate(),
  });

  return {
    create,
    update,
    remove,
  };
}
