import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createGroup, deleteGroup, getGroup, getGroups, updateGroup } from "../api/groups";

export default function useGroups(selectedId) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["groups"] });

  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
    refetchInterval: 10000,
  });

  const selected = useQuery({
    queryKey: ["groups", selectedId],
    queryFn: () => getGroup(selectedId),
    enabled: !!selectedId,
    refetchInterval: 10000,
  });

  const create = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const update = useMutation({
    mutationFn: updateGroup,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const remove = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  return {
    groups: groups.data ?? [],
    selected: selected.data ?? null,
    status: {
      groups: {
        isLoading: groups.isLoading,
        isError: groups.isError,
      },
      selected: {
        isLoading: selected.isLoading,
        isError: selected.isError,
      },
    },
    create,
    update,
    remove,
  };
}
