import { paths } from "@/app/paths";
import { SectionHeader } from "@/components/layouts/section-header/section-header";
import QueryState from "@/components/ui/query-state/query-state";
import { useGetMl } from "@/page-components/mls/api/get-ml";
import { ModelCard } from "@/page-components/mls/components/model-card/model-card";
import { useLoaderData, useNavigate } from "react-router-dom";
import s from "./groups.module.scss";
import { useTrainingModelOutletContext } from "./training-detail";

export function Component() {
  const navigate = useNavigate();
  const { modelId } = useLoaderData() as { modelId: string };
  const { group, models } = useTrainingModelOutletContext();
  const { data: liveModel } = useGetMl(modelId);
  const syncedModel = liveModel
    ? models.map((model) => (model.id === liveModel.id ? liveModel : model))
    : models;

  const toggleMl = (targetModelId: string) => {
    if (modelId === targetModelId) {
      navigate(paths.groupDetail(group.id));
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
      <section className={s.section}>
        <SectionHeader>
          <SectionHeader.Title>Модели</SectionHeader.Title>
          <SectionHeader.Side>
            <span className={s.countBadge}>{group.stats.models_count}</span>
          </SectionHeader.Side>
        </SectionHeader>
        <div className={s.cards}>
          {syncedModel.map((model) => {
            const isExpanded = modelId === model.id;

            return (
              <ModelCard
                key={model.id}
                model={model}
                expanded={isExpanded}
                onToggle={() => toggleMl(model.id)}
              />
            );
          })}
        </div>
      </section>
    </QueryState>
  );
}
