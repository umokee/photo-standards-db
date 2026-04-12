import { SectionHeader } from "@/components/layouts/section/section";

import QueryState from "@/components/ui/query-state/query-state";
import { formatDate } from "@/utils/formatDate";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import ModelDetails from "../ModelDetails";
import s from "./models-section.module.scss";

export const ModelsSection = ({
  group,
  models,
  selectedModelId,
  tasks,
  isLoading = false,
  isError = false,
  isActivating = false,
  getPendingLabel,
  onSelectModel,
  onResetSelection,
  onActivateModel,
}) => {
  return (
    <div>
      <SectionHeader bordered>
        <SectionHeader.Title>Модели</SectionHeader.Title>
        <SectionHeader.Side>
          <span className={s.countBadge}>{models.length}</span>
        </SectionHeader.Side>
      </SectionHeader>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!models.length}
        emptyTitle="Нет моделей"
      >
        <div className={s.cards}>
          {models.map((model) => {
            const isExpanded = selectedModelId === model.id;
            const pendingLabel = getPendingLabel(model);

            const canActivate =
              !model.is_active &&
              !!model.trained_at &&
              !["pending", "preparing", "training", "saving", "failed"].includes(
                model.training_status ?? ""
              );

            return (
              <article key={model.id} className={clsx(s.card, isExpanded && s.cardExpanded)}>
                <button
                  type="button"
                  className={s.cardHeader}
                  onClick={() => (isExpanded ? onResetSelection() : onSelectModel(model.id))}
                >
                  <div className={s.cardMain}>
                    <div className={s.cardTitleRow}>
                      <strong className={s.cardTitle}>{model.name}</strong>

                      <div className={s.cardBadges}>
                        {model.is_active && <span className={s.modelBadge}>active</span>}
                        <ChevronRight
                          size={16}
                          className={clsx(s.chevron, isExpanded && s.chevronExpanded)}
                        />
                      </div>
                    </div>

                    <div className={s.cardMeta}>
                      {model.architecture} · v{model.version}
                    </div>

                    <div className={s.cardMeta}>
                      {model.trained_at
                        ? `Обучена ${formatDate(model.trained_at)}`
                        : "Ещё не обучена"}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className={s.cardBody}>
                    <ModelDetails
                      group={group}
                      model={model}
                      pendingLabel={pendingLabel}
                      isActivating={isActivating}
                      onActivate={canActivate ? () => onActivateModel(model.id) : undefined}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
};
