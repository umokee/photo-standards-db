import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createGroup, deleteGroup, getGroup, getGroups, updateGroup } from "../api/groups";

const GROUPS_KEY = ["groups"];
const groupKey = (id) => ["groups", id];

export default function useGroups(groupId) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: GROUPS_KEY });
    if (groupId) qc.invalidateQueries({ queryKey: groupKey(groupId) });
  };

  const groupsQuery = useQuery({
    queryKey: GROUPS_KEY,
    queryFn: getGroups,
    staleTime: 30_000,
  });

  const groupQuery = useQuery({
    queryKey: groupKey(groupId),
    queryFn: () => getGroup(groupId),
    enabled: !!groupId,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: createGroup,
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: updateGroup,
    onSuccess: () => invalidate(),
  });

  const remove = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      qc.removeQueries({ queryKey: groupKey(groupId) });
      invalidate();
    },
  });

  return {
    groups: groupsQuery.data ?? [],
    group: groupQuery.data ?? null,
    status: {
      groups: {
        isLoading: groupsQuery.isLoading,
        isError: groupsQuery.isError,
      },
      group: {
        isLoading: groupQuery.isLoading,
        isError: groupQuery.isError,
      },
    },
    create,
    update,
    remove,
  };
}
