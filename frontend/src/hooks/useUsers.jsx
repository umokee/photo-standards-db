import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, getUsers, updateUser } from "../api/users";

export default function useUsers() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const users = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    refetchInterval: 10000,
  });

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const update = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const remove = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  return {
    users: users.data ?? [],
    status: {
      isLoading: users.isLoading,
      isError: users.isError,
    },
    create,
    update,
    remove,
  };
}
