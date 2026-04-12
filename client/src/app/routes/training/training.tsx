import { ContentHeader } from "@/components/layouts/content-header/content-header";
import { SectionHeader } from "@/components/layouts/section-header/section-header";
import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import useSidebar from "@/hooks/use-sidebar";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { useActivateModel } from "@/page-components/mls/api/activate-model";
import { useGetMls } from "@/page-components/mls/api/get-mls";
import ModelDetails from "@/page-components/mls/components/ModelDetails";
import { TrainModelGroup } from "@/page-components/mls/components/train-model";
import { MlModel, TrainingStatus } from "@/types/contracts";
import { formatDate } from "@/utils/formatDate";
import { Activity, Brain, CheckCircle2, CircleAlert, Clock3, Cpu, Rocket } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "../paths";
import s from "./training.module.scss";

const statusLabelMap: Record<TrainingStatus, string> = {
  pending: "В очереди",
  preparing: "Подготовка",
  training: "Обучение",
  saving: "Сохранение",
  done: "Готово",
  failed: "Ошибка",
};

const statusToneMap: Record<TrainingStatus, string> = {
  pending: s.statusPending,
  preparing: s.statusPreparing,
  training: s.statusTraining,
  saving: s.statusSaving,
  done: s.statusDone,
  failed: s.statusFailed,
};

const statusIconMap = {
  pending: Clock3,
  preparing: Cpu,
  training: Activity,
  saving: Rocket,
  done: CheckCircle2,
  failed: CircleAlert,
} as const;

const activeStatuses: TrainingStatus[] = ["pending", "preparing", "training", "saving"];
const runningStatuses: TrainingStatus[] = ["preparing", "training", "saving"];

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "n/a";
  return `${value}%`;
};

const getModelStatus = (model: MlModel): TrainingStatus =>
  model.training_status ?? (model.trained_at ? "done" : "pending");

const getModelProgress = (model: MlModel) => {
  if (model.training_status === "saving") return 100;
  if (model.training_progress === null || !model.epochs) return 0;
  return Math.min(100, Math.round((model.training_progress / model.epochs) * 100));
};

const sortByCreatedAtAsc = <T extends { created_at: string }>(items: T[]) =>
  [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

const sortByCreatedAtDesc = <T extends { created_at: string }>(items: T[]) =>
  [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

export function Component() {
  const navigate = useNavigate();

  const { data: groups = [], isLoading: groupsLoading, isError: groupsError } = useGetGroups();
  const { data: group, isLoading: groupLoading, isError: groupError } = useGetGroup(groupId);

  const { data: models = [], isLoading: modelsLoading, isError: modelsError } = useGetMls(groupId);


  const selectedModel = useMemo(() => {
    if (!models.length) return null;
    return (
      models.find((model) => model.id === modelId) ??
      models.find((model) => model.is_active) ??
      models[0]
    );
  }, [modelId, models]);

  const trainingHistory = useMemo(
    () =>
      sortByCreatedAtDesc(
        models.filter(
          (model) =>
            model.training_status !== null ||
            model.trained_at !== null ||
            model.training_error !== null
        )
      ),
    [models]
  );
  const runningTask = trainingHistory.find((model) =>
    runningStatuses.includes(getModelStatus(model))
  );
  const queuedTask = trainingHistory.find((model) => getModelStatus(model) === "pending");
  const pendingTasks = useMemo(
    () =>
      sortByCreatedAtAsc(trainingHistory.filter((model) => getModelStatus(model) === "pending")),
    [trainingHistory]
  );
  const nextPendingTask = pendingTasks[0] ?? null;
  const isStartingSoon = (model: MlModel) =>
    getModelStatus(model) === "pending" && !runningTask && nextPendingTask?.id === model.id;
  const getPendingPosition = (modelId: string) =>
    pendingTasks.findIndex((model) => model.id === modelId) + 1;
  const selectedModelPendingLabel =
    selectedModel && getModelStatus(selectedModel) === "pending"
      ? isStartingSoon(selectedModel)
        ? "Скоро стартует"
        : "В очереди"
      : undefined;
  const selectedModelStatus = selectedModel ? getModelStatus(selectedModel) : null;
  const canActivateSelectedModel =
    !!selectedModel &&
    !selectedModel.is_active &&
    !!selectedModel.trained_at &&
    selectedModelStatus !== "failed" &&
    !activeStatuses.includes(selectedModelStatus);

  const activateMutation = useActivateModel({ groupId: groupId ?? "" });



  return (
    <SplitLayout>
      <SplitLayout.Content>
        <SplitLayout.Body>
          <QueryState
            isLoading={groupLoading}
            isError={groupError}
            isEmpty={!group?.id}
            emptyTitle="Выберите группу"
          >

            <div className={s.layout}>
              <section className={s.main}>
                <div className={s.section}>
                  <SectionHeader bordered>
                    <SectionHeader.Title>Обучение</SectionHeader.Title>
                    <SectionHeader.Side>
                      <span className={s.helperText}>
                        Текущая база: {group?.stats.segment_groups_count} классов
                      </span>
                    </SectionHeader.Side>
                  </SectionHeader>

                  <div className={s.trainCard}>
                    <div className={s.trainSummary}>
                      <div>
                        <div className={s.trainSummaryTitle}>
                          Запуск новой модели через модальное окно
                        </div>
                        <div className={s.trainSummaryText}>
                          Форма обучения открывается отдельно и не перегружает основную страницу.
                        </div>
                      </div>
                      {groupId && group && (
                        <TrainModelGroup groupId={groupId} hasTrainData={hasTrainData} />
                      )}
                    </div>

                    <div className={s.trainFooter}>
                      <div className={s.requirements}>
                        <div className={s.requirement}>
                          <span>Эталоны</span>
                          <strong>{group?.stats.standards_count}</strong>
                        </div>
                        <div className={s.requirement}>
                          <span>Фото</span>
                          <strong>{group?.stats.images_count}</strong>
                        </div>
                        <div className={s.requirement}>
                          <span>Аннотации</span>
                          <strong>{group?.stats.polygons_count}</strong>
                        </div>
                        <div className={s.requirement}>
                          <span>Сумма split</span>
                          <strong>90%</strong>
                        </div>
                      </div>

                      <div className={s.actions}>
                        {!hasTrainData && (
                          <span className={s.warningText}>
                            Для обучения нужны эталоны, фото, классы и аннотации.
                          </span>
                        )}
                        <span className={s.helperText}>
                          Допустимые пределы задаются сервером и UI.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={s.section}>
                  <SectionHeader bordered>
                    <SectionHeader.Title>Выбранная модель</SectionHeader.Title>
                    <SectionHeader.Side>
                      <span className={s.helperText}>
                        {selectedModel ? `v${selectedModel.version}` : "Модель не выбрана"}
                      </span>
                    </SectionHeader.Side>
                  </SectionHeader>

                  <ModelDetails
                    group={group}
                    model={selectedModel}
                    pendingLabel={selectedModelPendingLabel}
                    isActivating={activateMutation.isPending}
                    onActivate={
                      canActivateSelectedModel
                        ? () => activateMutation.mutate(selectedModel!.id)
                        : undefined
                    }
                  />
                </div>
              </section>

              <aside className={s.aside}>
                <div className={s.panel}>
                  <SectionHeader bordered>
                    <SectionHeader.Title>Модели</SectionHeader.Title>
                    <SectionHeader.Side>
                      <span className={s.countBadge}>{models.length}</span>
                    </SectionHeader.Side>
                  </SectionHeader>

                  <QueryState
                    isLoading={modelsLoading}
                    isError={modelsError}
                    isEmpty={!models.length}
                    emptyTitle="Моделей пока нет"
                  >
                    <div className={s.modelList}>
                      {models.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          className={s.modelItem}
                          data-active={selectedModel?.id === model.id}
                          onClick={() => navigate(paths.trainingModel(groupId, model.id))}
                        >
                          <div className={s.modelItemTop}>
                            <strong>{model.name}</strong>
                            {model.is_active && <span className={s.modelBadge}>active</span>}
                          </div>
                          <div className={s.modelItemMeta}>
                            {model.architecture} · v{model.version}
                          </div>
                          <div className={s.modelItemMeta}>
                            {model.trained_at
                              ? `Обучена ${formatDate(model.trained_at)}`
                              : "Ещё не обучена"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </QueryState>
                </div>
              </aside>
            </div>
          </QueryState>
        </SplitLayout.Body>
      </SplitLayout.Content>
    </SplitLayout>
  );
}
