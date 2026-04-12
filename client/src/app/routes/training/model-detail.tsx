import { paths } from "@/app/paths";
import { Section } from "@/components/layouts/section/section";
import QueryState from "@/components/ui/query-state/query-state";
import { useGetMl } from "@/page-components/mls/api/get-ml";
import { ModelCard } from "@/page-components/mls/components/model-card/model-card";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useTrainingModelOutletContext } from "./training-detail";

export function Component() {
  const navigate = useNavigate();
  const { modelId } = useLoaderData() as { modelId: string };
  const { group, models } = useTrainingModelOutletContext();
  const { data: liveModel } = useGetMl(modelId);
  const syncedModel = liveModel
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
      isEmpty={group.stats.models_count === 0}
      emptyTitle="Нет моделей"
      emptyDescription="Обучите модель для этой группы"
    >
      <Section title={`Модели · ${group.stats.models_count}`}>
        {syncedModel.map((model) => {
          const isExpanded = modelId === model.id;

          return (
            <ModelCard
              key={model.id}
              model={model}
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
