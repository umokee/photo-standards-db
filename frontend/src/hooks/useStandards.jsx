import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { batchUpdateSegments, createSegment, deleteSegment, updateSegment } from "../api/segments";
import { createStandard, deleteStandard, getStandard, updateStandard } from "../api/standards";

export default function useStandards(id) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["standards"] });
    queryClient.invalidateQueries({ queryKey: ["groups"] });
  };

  const selected = useQuery({
    queryKey: ["standards", id],
    queryFn: () => getStandard(id),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const create = useMutation({
    mutationFn: createStandard,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const update = useMutation({
    mutationFn: updateStandard,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const remove = useMutation({
    mutationFn: deleteStandard,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const createSegment_ = useMutation({
    mutationFn: createSegment,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const updateSegment_ = useMutation({
    mutationFn: updateSegment,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const batchUpdateSegments_ = useMutation({
    mutationFn: batchUpdateSegments,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const removeSegment_ = useMutation({
    mutationFn: deleteSegment,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  return {
    selected: selected.data ?? null,
    status: {
      isLoading: selected.isLoading,
      isError: selected.isError,
    },
    create,
    update,
    remove,
    segment: {
      create: createSegment_,
      update: updateSegment_,
      batchUpdate: batchUpdateSegments_,
      remove: removeSegment_,
    },
  };
}
