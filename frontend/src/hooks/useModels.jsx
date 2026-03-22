import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activateModel, getModels, trainModel } from "../api/models";

export default function useModels(groupId) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["models"] });
    qc.invalidateQueries({ queryKey: ["groups"] });
  };

  const modelsQuery = useQuery({
    queryKey: ["models", groupId],
    queryFn: () => getModels(groupId),
    enabled: !!groupId,
    staleTime: 30_000,
  });

  const train = useMutation({ mutationFn: trainModel, onSuccess: invalidate });
  const activate = useMutation({ mutationFn: activateModel, onSuccess: invalidate });

  return {
    models: modelsQuery.data ?? [],
    isLoading: modelsQuery.isLoading,
    isError: modelsQuery.isError,
    train,
    activate,
  };
}
