import { ContentHeader } from "@/components/layouts/content-header/content-header";
import { SectionHeader } from "@/components/layouts/section-header/section-header";
import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import QueryState from "@/components/ui/query-state/query-state";
import Select from "@/components/ui/select/select";
import useSidebar from "@/hooks/use-sidebar";
import { useGetGroup, deafultGroup } from "@/page-components/groups/api/get-group";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { useActivateModel } from "@/page-components/mls/api/activate-model";
import { useGetMlsPolling } from "@/page-components/mls/api/get-mls";
import { useGetTrainingTasks } from "@/page-components/mls/api/get-training-tasks";
import { useTrainModel } from "@/page-components/mls/api/train-model";
import ModelDetails from "@/page-components/mls/components/ModelDetails";
import { MlArchitecture, TrainingStatus } from "@/page-components/mls/schemas";
import { formatDate } from "@/utils/formatDate";
import { Activity, Brain, CheckCircle2, CircleAlert, Clock3, Cpu, Rocket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import s from "./training.module.scss";

const ARCHITECTURE_OPTIONS: { value: MlArchitecture; label: string }[] = [
  { value: "yolov26n-seg", label: "YOLO v26 Nano" },
  { value: "yolov26s-seg", label: "YOLO v26 Small" },
  { value: "yolov26m-seg", label: "YOLO v26 Medium" },
  { value: "yolov26l-seg", label: "YOLO v26 Large" },
  { value: "yolov26x-seg", label: "YOLO v26 XLarge" },
];

const IMAGE_SIZE_OPTIONS = ["320", "416", "512", "640", "768", "1024", "1280"].map((value) => ({
  value,
  label: value,
}));

const TRAIN_RATIO_MIN = 50;
const TRAIN_RATIO_MAX = 80;
const VAL_RATIO_MIN = 0;
const VAL_RATIO_MAX = 45;
const RATIO_SUM_MAX = 90;
const EPOCHS_MIN = 1;
const EPOCHS_MAX = 1000;
const BATCH_SIZE_MIN = 1;
const BATCH_SIZE_MAX = 256;

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

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "n/a";
  return `${value}%`;
};

const clampNumber = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const sanitizeNumericInput = (value: string, min: number, max: number) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return String(clampNumber(Number(digits), min, max));
};

const TrainingLaunchModal = ({
  architecture,
  setArchitecture,
  epochs,
  setEpochs,
  batchSize,
  setBatchSize,
  imageSize,
  setImageSize,
  trainRatio,
  setTrainRatio,
  valRatio,
  setValRatio,
  ratioSum,
  isRatioInvalid,
  hasTrainData,
  isPending,
  isSuccess,
  onSubmit,
}: {
  architecture: MlArchitecture;
  setArchitecture: (value: MlArchitecture) => void;
  epochs: string;
  setEpochs: (value: string) => void;
  batchSize: string;
  setBatchSize: (value: string) => void;
  imageSize: string;
  setImageSize: (value: string) => void;
  trainRatio: string;
  setTrainRatio: (value: string) => void;
  valRatio: string;
  setValRatio: (value: string) => void;
  ratioSum: number;
  isRatioInvalid: boolean;
  hasTrainData: boolean;
  isPending: boolean;
  isSuccess: boolean;
  onSubmit: () => void;
}) => {
  const close = useModalClose();

  useEffect(() => {
    if (isSuccess) {
      close();
    }
  }, [close, isSuccess]);

  return (
    <>
      <Modal.Header>Запуск обучения</Modal.Header>
      <Modal.Body>
        <div className={s.modalIntro}>
          <div className={s.modalIntroTitle}>Параметры запуска</div>
          <div className={s.modalIntroText}>
            Значения ограничены правилами сервера, поэтому выйти за допустимые рамки нельзя.
          </div>
        </div>

        <div className={s.trainGrid}>
          <Select
            label="Архитектура"
            options={ARCHITECTURE_OPTIONS}
            value={architecture}
            onChange={(value) => setArchitecture(value as MlArchitecture)}
          />
          <Input
            label="Эпохи"
            type="number"
            min={EPOCHS_MIN}
            max={EPOCHS_MAX}
            step={1}
            value={epochs}
            onChange={(value) => setEpochs(sanitizeNumericInput(value, EPOCHS_MIN, EPOCHS_MAX))}
          />
          <Input
            label="Batch size"
            type="number"
            min={BATCH_SIZE_MIN}
            max={BATCH_SIZE_MAX}
            step={1}
            value={batchSize}
            onChange={(value) =>
              setBatchSize(sanitizeNumericInput(value, BATCH_SIZE_MIN, BATCH_SIZE_MAX))
            }
          />
          <Select
            label="Размер изображения"
            options={IMAGE_SIZE_OPTIONS}
            value={imageSize}
            onChange={setImageSize}
          />
          <Input
            label="Train %"
            type="number"
            min={TRAIN_RATIO_MIN}
            max={TRAIN_RATIO_MAX}
            step={1}
            value={trainRatio}
            onChange={(value) =>
              setTrainRatio(sanitizeNumericInput(value, TRAIN_RATIO_MIN, TRAIN_RATIO_MAX))
            }
          />
          <Input
            label="Val %"
            type="number"
            min={VAL_RATIO_MIN}
            max={VAL_RATIO_MAX}
            step={1}
            value={valRatio}
            onChange={(value) =>
              setValRatio(sanitizeNumericInput(value, VAL_RATIO_MIN, VAL_RATIO_MAX))
            }
          />
        </div>

        <div className={s.modalStats}>
          <div className={s.requirement}>
            <span>Train диапазон</span>
            <strong>
              {TRAIN_RATIO_MIN}-{TRAIN_RATIO_MAX}%
            </strong>
          </div>
          <div className={s.requirement}>
            <span>Val диапазон</span>
            <strong>
              {VAL_RATIO_MIN}-{VAL_RATIO_MAX}%
            </strong>
          </div>
          <div className={s.requirement}>
            <span>Сумма split</span>
            <strong className={isRatioInvalid ? s.valueDanger : undefined}>{ratioSum}%</strong>
          </div>
        </div>

        {!hasTrainData && (
          <div className={s.warningBox}>
            Для обучения нужны эталоны, фото, классы и аннотации.
          </div>
        )}
        {isRatioInvalid && (
          <div className={s.warningBox}>
            Сумма `train` и `val` не должна превышать {RATIO_SUM_MAX}%.
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={close}>
          Отмена
        </Button>
        <Button
          variant="ml"
          disabled={isPending || !hasTrainData || isRatioInvalid}
          onClick={onSubmit}
        >
          Запустить обучение
        </Button>
      </Modal.Footer>
    </>
  );
};

export function Component() {
  const { close: closeSidebar } = useSidebar();
  const navigate = useNavigate();
  const { groupId = null, modelId = null } = useParams();
  const [search, setSearch] = useState("");

  const [architecture, setArchitecture] = useState<MlArchitecture>("yolov26n-seg");
  const [epochs, setEpochs] = useState("100");
  const [batchSize, setBatchSize] = useState("16");
  const [imageSize, setImageSize] = useState("640");
  const [trainRatio, setTrainRatio] = useState("80");
  const [valRatio, setValRatio] = useState("10");

  const { data: groups = [], isLoading: groupsLoading, isError: groupsError } = useGetGroups();
  const {
    data: group = deafultGroup,
    isLoading: groupLoading,
    isError: groupError,
  } = useGetGroup(groupId);

  const {
    data: models = [],
    isLoading: modelsLoading,
    isError: modelsError,
  } = useGetMlsPolling(groupId, 5000);

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
  } = useGetTrainingTasks(groupId, 5000);

  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  const selectedModel = useMemo(() => {
    if (!models.length) return null;
    return (
      models.find((model) => model.id === modelId) ??
      models.find((model) => model.is_active) ??
      models[0]
    );
  }, [modelId, models]);

  const activeTask = tasks.find((task) =>
    ["pending", "preparing", "training", "saving"].includes(task.status)
  );
  const runningTask = tasks.find((task) => ["preparing", "training", "saving"].includes(task.status));
  const queuedTask = tasks.find((task) => task.status === "pending");
  const selectedModelTask =
    selectedModel ? tasks.find((task) => task.model_id === selectedModel.id) ?? null : null;

  const trainMutation = useTrainModel({
    groupId: groupId ?? "",
    mutationConfig: {
      onSuccess: (task) => {
        navigate(`/training/${groupId}/models/${task.model_id ?? ""}`);
      },
    },
  });

  const activateMutation = useActivateModel({ groupId: groupId ?? "" });

  const hasTrainData =
    group.stats.standards_count > 0 &&
    group.stats.images_count > 0 &&
    group.stats.polygons_count > 0 &&
    group.stats.segment_groups_count > 0;

  const ratioSum = Number(trainRatio || 0) + Number(valRatio || 0);
  const isRatioInvalid = ratioSum > RATIO_SUM_MAX;

  const handleTrain = () => {
    if (!groupId || !hasTrainData || isRatioInvalid) return;

    trainMutation.mutate({
      group_id: groupId,
      architecture,
      epochs: clampNumber(Number(epochs || EPOCHS_MIN), EPOCHS_MIN, EPOCHS_MAX),
      batch_size: clampNumber(
        Number(batchSize || BATCH_SIZE_MIN),
        BATCH_SIZE_MIN,
        BATCH_SIZE_MAX
      ),
      imgsz: Number(imageSize || 0),
      train_ratio: clampNumber(
        Number(trainRatio || TRAIN_RATIO_MIN),
        TRAIN_RATIO_MIN,
        TRAIN_RATIO_MAX
      ),
      val_ratio: clampNumber(Number(valRatio || VAL_RATIO_MIN), VAL_RATIO_MIN, VAL_RATIO_MAX),
    });
  };

  return (
    <SplitLayout>
      <SplitLayout.Sidebar>
        <Sidebar>
          <Sidebar.Header>
            <Sidebar.HeaderTop>
              <Sidebar.Title>Группы</Sidebar.Title>
            </Sidebar.HeaderTop>
            <Input placeholder="Поиск..." noMargin value={search} onChange={setSearch} />
          </Sidebar.Header>
          <Sidebar.List>
            <QueryState
              isLoading={groupsLoading}
              isError={groupsError}
              isEmpty={!filtered.length}
              emptyText="Нет групп"
              loader="skeleton"
            >
              {filtered.map((group) => (
                <Sidebar.Item
                  key={group.id}
                  active={groupId === group.id}
                  onClick={() => {
                    navigate(`/training/${group.id}`);
                    closeSidebar();
                  }}
                >
                  <Sidebar.ItemDot />
                  <Sidebar.ItemBody>
                    <Sidebar.ItemName>{group.name}</Sidebar.ItemName>
                    <Sidebar.ItemMeta>{group.stats.models_count} моделей</Sidebar.ItemMeta>
                  </Sidebar.ItemBody>
                  <Sidebar.ItemSide>{group.stats.standards_count}</Sidebar.ItemSide>
                </Sidebar.Item>
              ))}
            </QueryState>
          </Sidebar.List>
        </Sidebar>
      </SplitLayout.Sidebar>

      <SplitLayout.Content>
        <SplitLayout.Body>
          <QueryState
            isLoading={groupLoading}
            isError={groupError}
            isEmpty={!group.id}
            emptyText="Выберите группу"
          >
            <ContentHeader>
              <ContentHeader.Top
                title={group.name}
                subtitles={[
                  ...(group.description ? [group.description] : []),
                  `Создана ${formatDate(group.created_at)}`,
                ]}
                meta={[
                  `${group.stats.standards_count} эталонов`,
                  `${group.stats.images_count} изображений`,
                  `${group.stats.annotated_count} размечено`,
                  `${group.stats.polygons_count} полигонов`,
                ]}
              >
                <ContentHeader.Actions>
                  {runningTask ? (
                    <span className={s.liveBadge}>
                      <Brain size={14} />
                      Обучение активно
                    </span>
                  ) : queuedTask ? (
                    <span className={s.queueHeaderBadge}>
                      <Clock3 size={14} />
                      Задача в очереди
                    </span>
                  ) : (
                    <span className={s.liveBadgeIdle}>Ожидание</span>
                  )}
                </ContentHeader.Actions>
              </ContentHeader.Top>
            </ContentHeader>

            <div className={s.layout}>
              <section className={s.main}>
                <div className={s.section}>
                  <SectionHeader bordered>
                    <SectionHeader.Title>Обучение</SectionHeader.Title>
                    <SectionHeader.Side>
                      <span className={s.helperText}>
                        Текущая база: {group.stats.segment_groups_count} классов
                      </span>
                    </SectionHeader.Side>
                  </SectionHeader>

                  <div className={s.trainCard}>
                    <div className={s.trainSummary}>
                      <div>
                        <div className={s.trainSummaryTitle}>Запуск новой модели через модальное окно</div>
                        <div className={s.trainSummaryText}>
                          Форма обучения открывается отдельно и не перегружает основную страницу.
                        </div>
                      </div>
                      <Modal>
                        <Modal.Trigger>
                          <Button
                            variant="ml"
                            disabled={trainMutation.isPending || !hasTrainData}
                          >
                            Запустить обучение
                          </Button>
                        </Modal.Trigger>
                        <Modal.Content>
                          <TrainingLaunchModal
                            architecture={architecture}
                            setArchitecture={setArchitecture}
                            epochs={epochs}
                            setEpochs={setEpochs}
                            batchSize={batchSize}
                            setBatchSize={setBatchSize}
                            imageSize={imageSize}
                            setImageSize={setImageSize}
                            trainRatio={trainRatio}
                            setTrainRatio={setTrainRatio}
                            valRatio={valRatio}
                            setValRatio={setValRatio}
                            ratioSum={ratioSum}
                            isRatioInvalid={isRatioInvalid}
                            hasTrainData={hasTrainData}
                            isPending={trainMutation.isPending}
                            isSuccess={trainMutation.isSuccess}
                            onSubmit={handleTrain}
                          />
                        </Modal.Content>
                      </Modal>
                    </div>

                    <div className={s.trainFooter}>
                      <div className={s.requirements}>
                        <div className={s.requirement}>
                          <span>Эталоны</span>
                          <strong>{group.stats.standards_count}</strong>
                        </div>
                        <div className={s.requirement}>
                          <span>Фото</span>
                          <strong>{group.stats.images_count}</strong>
                        </div>
                        <div className={s.requirement}>
                          <span>Аннотации</span>
                          <strong>{group.stats.polygons_count}</strong>
                        </div>
                        <div className={s.requirement}>
                          <span>Сумма split</span>
                          <strong className={isRatioInvalid ? s.valueDanger : undefined}>
                            {ratioSum}%
                          </strong>
                        </div>
                      </div>

                      <div className={s.actions}>
                        {!hasTrainData && (
                          <span className={s.warningText}>
                            Для обучения нужны эталоны, фото, классы и аннотации.
                          </span>
                        )}
                        {isRatioInvalid && (
                          <span className={s.warningText}>
                            Сумма `train` и `val` не должна превышать {RATIO_SUM_MAX}%.
                          </span>
                        )}
                        <span className={s.helperText}>Допустимые пределы задаются сервером и UI.</span>
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
                    task={selectedModelTask}
                    isActivating={activateMutation.isPending}
                    onActivate={
                      selectedModel && !selectedModel.is_active && !!selectedModel.trained_at
                        ? () => activateMutation.mutate(selectedModel.id)
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
                    emptyText="Моделей пока нет"
                  >
                    <div className={s.modelList}>
                      {models.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          className={s.modelItem}
                          data-active={selectedModel?.id === model.id}
                          onClick={() => navigate(`/training/${groupId}/models/${model.id}`)}
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

                <div className={s.panel}>
                  <SectionHeader bordered>
                    <SectionHeader.Title>Задачи обучения</SectionHeader.Title>
                    <SectionHeader.Side>
                      {runningTask ? (
                        <span className={s.countBadgeLive}>live</span>
                      ) : queuedTask ? (
                        <span className={s.countBadgeQueued}>queue</span>
                      ) : null}
                    </SectionHeader.Side>
                  </SectionHeader>

                  <QueryState
                    isLoading={tasksLoading}
                    isError={tasksError}
                    isEmpty={!tasks.length}
                    emptyText="История обучения пуста"
                  >
                    <div className={s.taskList}>
                      {tasks.map((task) => {
                        const Icon = statusIconMap[task.status];

                        return (
                          <div key={task.id} className={s.taskItem}>
                            <div className={s.taskHead}>
                              <div className={s.taskTitle}>
                                <Icon size={15} />
                                <span>{task.model_id ? `Модель ${task.model_id.slice(0, 8)}` : "Новая модель"}</span>
                              </div>
                              <span className={`${s.statusBadge} ${statusToneMap[task.status]}`}>
                                {statusLabelMap[task.status]}
                              </span>
                            </div>

                            <div className={s.taskMeta}>
                              <span>train {formatPercent(task.train_ratio)}</span>
                              <span>val {formatPercent(task.val_ratio)}</span>
                              <span>{formatDate(task.created_at)}</span>
                            </div>

                            {(task.progress !== null || task.stage || task.status === "pending") && (
                              <div className={s.taskProgress}>
                                <div className={s.taskProgressTop}>
                                  <span>
                                    {task.status === "pending"
                                      ? "Ожидает запуска"
                                      : task.stage ?? "В процессе"}
                                  </span>
                                  <strong>{task.status === "pending" ? "queue" : task.progress ?? 0}</strong>
                                </div>
                                <div className={s.taskBar}>
                                  <div
                                    className={s.taskBarFill}
                                    style={{
                                      width: `${task.status === "pending" ? 12 : Math.min(task.progress ?? 0, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {task.error && <div className={s.taskError}>{task.error}</div>}
                          </div>
                        );
                      })}
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
