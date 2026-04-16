import { paths } from "@/app/paths";
import { Section } from "@/components/layouts/section/section";
import QueryState from "@/components/ui/query-state/query-state";
import { useGetModel } from "@/page-components/models/api/get-ml";
import { ModelCard } from "@/page-components/models/components/model-card/model-card";
import { getModelTask } from "@/page-components/models/lib/training";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useTrainingModelOutletContext } from "./training-detail";

export function Component() {
  const navigate = useNavigate();
  const { modelId } = useLoaderData() as { modelId: string };
  const { group, models, tasks } = useTrainingModelOutletContext();
  const { data: liveModel } = useGetModel(modelId);

  const syncedModels = liveModel
    ? models.map((model) => (model.id === liveModel.id ? liveModel : model))
    : models;

  const toggleModel = (targetModelId: string) => {
    if (modelId === targetModelId) {
      navigate(paths.trainingGroup(group.id));
      return;
    }

    navigate(paths.trainingModel(group.id, targetModelId));
  };

  return (
    <QueryState
      size="block"
      isEmpty={group.stats.models_count === 0}
      emptyTitle="Нет моделей"
      emptyDescription="Обучите модель для этой группы"
    >
      <Section title={`Модели · ${group.stats.models_count}`}>
        {syncedModels.map((model) => {
          const isExpanded = modelId === model.id;

          return (
            <ModelCard
              key={model.id}
              model={model}
              task={getModelTask(model, tasks)}
              group={group}
              expanded={isExpanded}
              onToggle={() => toggleModel(model.id)}
            />
          );
        })}
      </Section>
    </QueryState>
  );
}
