import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activateModel, getModels, trainModel } from "../api/models";
import { keys } from "../queryKeys";
import { MlModel } from "../types/api";

export default function useModels(groupId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keys.models.all() });
    qc.invalidateQueries({ queryKey: keys.groups.all() });
  };

  const modelsQuery = useQuery<MlModel[]>({
    queryKey: keys.models.byGroup(groupId!),
    queryFn: () => getModels(groupId!),
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
