import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCamera, deleteCamera, getCameras, updateCamera } from "../api/cameras";

export default function useCameras() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cameras"] });

  const cameras = useQuery({
    queryKey: ["cameras"],
    queryFn: getCameras,
    refetchInterval: 10000,
  });

  const create = useMutation({
    mutationFn: createCamera,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const update = useMutation({
    mutationFn: updateCamera,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  const remove = useMutation({
    mutationFn: deleteCamera,
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => console.error("API Error", err),
  });

  return {
    cameras: cameras.data ?? [],
    status: {
      isLoading: cameras.isLoading,
      isError: cameras.isError,
    },
    create,
    update,
    remove,
  };
}
