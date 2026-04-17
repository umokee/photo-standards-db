import { paths } from "@/app/paths";
import { Section } from "@/components/layouts/section/section";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import { Badge } from "@/components/ui/badge/badge";
import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import Select from "@/components/ui/select/select";
import { useInspectionModeOptions } from "@/constants";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { useRunInspection } from "@/page-components/inspections/api/run-inspection";
import { useSaveInspection } from "@/page-components/inspections/api/save-inspection";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { useGetTask } from "@/page-components/tasks/api/get-task";
import { InspectionTaskResult } from "@/types/contracts";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";

type InspectionLayoutContext = {
  file: File | null;
  setFile: (file: File | null) => void;
  result: InspectionTaskResult | null;
  taskStatus: string | null;
  taskStage: string | null;
  taskProgress: number | null;
  isLocked: boolean;
};

const ENABLED_INSPECTION_MODES = new Set(["photo"]);

const inspectionResultBadgeType = (status: string): "info" | "success" | "warning" | "danger" => {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
      return "danger";
    default:
      return "info";
  }
};

const isActiveTask = (status?: string | null) =>
  ["pending", "queued", "running"].includes(status ?? "");

export function Component() {
  const navigate = useNavigate();
  const { mode, groupId, standardId } = useParams();

  const [file, setFile] = useState<File | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [savedInspectionId, setSavedInspectionId] = useState<string | null>(null);
  const [selectedSegmentClassIds, setSelectedSegmentClassIds] = useState<string[]>([]);

  const runMutation = useRunInspection({
    mutationConfig: {
      onSuccess: (data) => {
        setPendingTaskId(data.task_id);
        setSavedInspectionId(null);
      },
    },
  });

  const { data: task } = useGetTask(pendingTaskId);

  const taskStatus = task?.status ?? null;
  const taskStage = task?.stage ?? null;
  const taskError = task?.error ?? null;
  const taskProgress = task?.progress_percent ?? null;

  const result = useMemo(
    () => (task?.result as unknown as InspectionTaskResult | null) ?? null,
    [task?.result]
  );

  useEffect(() => {
    if (result?.inspection_id) {
      setSavedInspectionId(result.inspection_id);
    }
  }, [result?.inspection_id]);

  useEffect(() => {
    setPendingTaskId(null);
    setSavedInspectionId(null);
    setFile(null);
    setSelectedSegmentClassIds([]);
  }, [mode, groupId, standardId]);

  const currentMode = mode ?? "photo";
  const locked = isActiveTask(taskStatus) || runMutation.isPending;

  const isRunDisabled = !standardId || !file || !selectedSegmentClassIds.length || locked;

  const runLabel = locked ? taskStage || "Проверка выполняется..." : "Запустить проверку";

  const handleRun = () => {
    if (!standardId || !file || !selectedSegmentClassIds.length) return;

    runMutation.mutate({
      standard_id: standardId,
      selected_segment_class_ids: selectedSegmentClassIds,
      mode: currentMode,
      image: file,
    });
  };

  const handleSaved = (inspectionId: string) => {
    setSavedInspectionId(inspectionId);
  };

  return (
    <SplitLayout>
      <SplitLayout.Content>
        <SplitLayout.Topbar>
          <InspectionTopbar onRun={handleRun} runDisabled={isRunDisabled} runLabel={runLabel} />
        </SplitLayout.Topbar>

        <SplitLayout.Body bare>
          <Outlet
            context={{
              file,
              setFile,
              result,
              taskStatus,
              taskStage,
              taskProgress,
              isLocked: locked,
            }}
          />
        </SplitLayout.Body>
      </SplitLayout.Content>

      <SplitLayout.Panel>
        <InspectionSidePanel
          groupId={groupId ?? null}
          standardId={standardId ?? null}
          taskStatus={taskStatus}
          taskStage={taskStage}
          taskError={taskError}
          taskProgress={taskProgress}
          result={result}
          selectedSegmentClassIds={selectedSegmentClassIds}
          setSelectedSegmentClassIds={setSelectedSegmentClassIds}
          isTaskActive={locked}
          savedInspectionId={savedInspectionId}
          onSaved={handleSaved}
        />
      </SplitLayout.Panel>
    </SplitLayout>
  );
}

const InspectionTopbar = ({
  onRun,
  runDisabled,
  runLabel,
}: {
  onRun: () => void;
  runDisabled: boolean;
  runLabel: string;
}) => {
  const navigate = useNavigate();
  const { mode, groupId, standardId } = useParams();
  const { data: groups } = useGetGroups();
  const modeOptions = useInspectionModeOptions();

  const currentMode = mode ?? modeOptions[0]?.value ?? "photo";

  const handleModeChange = (nextMode: string) => {
    if (groupId && standardId) {
      navigate(paths.inspectionStandard(nextMode, groupId, standardId));
      return;
    }

    if (groupId) {
      navigate(paths.inspectionGroup(nextMode, groupId));
      return;
    }

    navigate(paths.inspectionMode(nextMode));
  };

  const handleGroupChange = (nextGroupId: string) => {
    if (!nextGroupId) {
      navigate(paths.inspectionMode(currentMode));
      return;
    }

    navigate(paths.inspectionGroup(currentMode, nextGroupId));
  };

  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: group.name,
  }));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(200px, 220px) minmax(220px, 280px) auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {modeOptions.map((option) => {
          const isActive = option.value === currentMode;
          const isEnabled = ENABLED_INSPECTION_MODES.has(option.value);

          return (
            <button
              key={option.value}
              type="button"
              disabled={!isEnabled}
              title={isEnabled ? undefined : "Режим пока недоступен"}
              onClick={() => {
                if (!isEnabled) return;
                handleModeChange(option.value);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #d6d0c4",
                background: isActive ? "#e8e1d2" : "#fffaf0",
                fontWeight: isActive ? 700 : 500,
                cursor: isEnabled ? "pointer" : "not-allowed",
                opacity: isEnabled ? 1 : 0.48,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <Select
        noMargin
        placeholder="Выберите группу"
        options={groupOptions}
        value={groupId ?? ""}
        onChange={handleGroupChange}
      />

      {groupId ? (
        <InspectionStandardSelect mode={currentMode} groupId={groupId} value={standardId ?? ""} />
      ) : (
        <Select
          noMargin
          disabled
          placeholder="Сначала выберите группу"
          options={[]}
          value=""
          onChange={() => {}}
        />
      )}

      <Button disabled={runDisabled} onClick={onRun}>
        {runLabel}
      </Button>
    </div>
  );
};

const InspectionStandardSelect = ({
  mode,
  groupId,
  value,
}: {
  mode: string;
  groupId: string;
  value: string;
}) => {
  const navigate = useNavigate();
  const { data: group } = useGetGroup(groupId);

  const standardOptions = group.standards.map((standard) => ({
    value: standard.id,
    label: standard.name,
  }));

  const handleStandardChange = (nextStandardId: string) => {
    if (!nextStandardId) {
      navigate(paths.inspectionGroup(mode, groupId));
      return;
    }

    navigate(paths.inspectionStandard(mode, groupId, nextStandardId));
  };

  return (
    <Select
      noMargin
      placeholder="Выберите эталон"
      options={standardOptions}
      value={value}
      onChange={handleStandardChange}
    />
  );
};

function InspectionSidePanel({
  groupId,
  standardId,
  taskStatus,
  taskStage,
  taskError,
  taskProgress,
  result,
  selectedSegmentClassIds,
  setSelectedSegmentClassIds,
  isTaskActive,
  savedInspectionId,
  onSaved,
}: {
  groupId: string | null;
  standardId: string | null;
  taskStatus: string | null;
  taskStage: string | null;
  taskError: string | null;
  taskProgress: number | null;
  result: InspectionTaskResult | null;
  selectedSegmentClassIds: string[];
  setSelectedSegmentClassIds: (value: string[]) => void;
  isTaskActive: boolean;
  savedInspectionId: string | null;
  onSaved: (inspectionId: string) => void;
}) {
  if (!groupId) {
    return (
      <QueryState
        isEmpty
        size="block"
        emptyTitle="Выберите группу"
        emptyDescription="После выбора группы здесь появятся классы проверки"
      />
    );
  }

  if (!standardId) {
    return <InspectionPanelGroupState groupId={groupId} />;
  }

  if (result) {
    return (
      <InspectionResultPanel
        result={result}
        savedInspectionId={savedInspectionId}
        onSaved={onSaved}
      />
    );
  }

  return (
    <InspectionClassesPanel
      standardId={standardId}
      taskStatus={taskStatus}
      taskStage={taskStage}
      taskError={taskError}
      taskProgress={taskProgress}
      selectedSegmentClassIds={selectedSegmentClassIds}
      setSelectedSegmentClassIds={setSelectedSegmentClassIds}
      disabled={isTaskActive}
    />
  );
}

function InspectionPanelGroupState({ groupId }: { groupId: string }) {
  const { data: group } = useGetGroup(groupId);
  const hasStandards = group.standards.length > 0;

  return (
    <QueryState
      isEmpty
      size="block"
      emptyTitle={hasStandards ? "Выберите эталон" : "В этой группе нет эталонов"}
      emptyDescription={
        hasStandards
          ? "После выбора эталона здесь появится дерево классов"
          : "Выберите другую группу или создайте эталон"
      }
    />
  );
}

function InspectionClassesPanel({
  standardId,
  taskStatus,
  taskStage,
  taskError,
  taskProgress,
  selectedSegmentClassIds,
  setSelectedSegmentClassIds,
  disabled,
}: {
  standardId: string;
  taskStatus: string | null;
  taskStage: string | null;
  taskError: string | null;
  taskProgress: number | null;
  selectedSegmentClassIds: string[];
  setSelectedSegmentClassIds: (value: string[]) => void;
  disabled: boolean;
}) {
  const { data: standard } = useGetStandardDetail(standardId);
  const [initializedStandardId, setInitializedStandardId] = useState<string | null>(null);

  const selectableSegmentClasses = useMemo(() => {
    const grouped = standard.segment_class_categories.flatMap(
      (category) => category.segment_classes
    );

    return [...grouped, ...standard.ungrouped_segment_classes].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [standard]);

  useEffect(() => {
    if (initializedStandardId === standard.id) return;

    setSelectedSegmentClassIds(selectableSegmentClasses.map((item) => item.id));
    setInitializedStandardId(standard.id);
  }, [initializedStandardId, selectableSegmentClasses, setSelectedSegmentClassIds, standard.id]);

  const selectedSet = useMemo(() => new Set(selectedSegmentClassIds), [selectedSegmentClassIds]);

  const toggleSegmentClass = (segmentClassId: string) => {
    if (disabled) return;

    setSelectedSegmentClassIds(
      selectedSet.has(segmentClassId)
        ? selectedSegmentClassIds.filter((id) => id !== segmentClassId)
        : [...selectedSegmentClassIds, segmentClassId]
    );
  };

  const allSelected =
    selectableSegmentClasses.length > 0 &&
    selectableSegmentClasses.every((item) => selectedSet.has(item.id));

  const handleToggleAll = () => {
    if (disabled) return;

    if (allSelected) {
      setSelectedSegmentClassIds([]);
      return;
    }

    setSelectedSegmentClassIds(selectableSegmentClasses.map((item) => item.id));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section
        title="Состояние проверки"
        side={
          taskStatus ? (
            <Badge type={inspectionResultBadgeType(taskStatus)}>{taskStatus}</Badge>
          ) : undefined
        }
        bordered
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: "var(--text-secondary)" }}>{taskStage ?? "Ожидает запуска"}</div>

          {typeof taskProgress === "number" && (
            <div style={{ color: "var(--text-secondary)" }}>Прогресс: {taskProgress}%</div>
          )}

          {taskError && <div style={{ color: "var(--danger-text)" }}>{taskError}</div>}
        </div>
      </Section>

      <Section
        title="Классы для проверки"
        side={
          <div style={{ display: "flex", gap: 8 }}>
            <Badge>{selectedSegmentClassIds.length}</Badge>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || !selectableSegmentClasses.length}
              onClick={handleToggleAll}
            >
              {allSelected ? "Снять все" : "Выбрать все"}
            </Button>
          </div>
        }
        bordered
        scrollable
        maxContentHeight={420}
      >
        <QueryState
          isEmpty={!selectableSegmentClasses.length}
          emptyTitle="Нет классов"
          emptyDescription="Для выбранного эталона не настроены классы сегментации"
        >
          <div style={{ display: "grid", gap: 16 }}>
            {standard.segment_class_categories.map((category) => (
              <div key={category.id} style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  {category.name}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {category.segment_classes.map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: disabled ? "default" : "pointer",
                        opacity: disabled ? 0.65 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(item.id)}
                        disabled={disabled}
                        onChange={() => toggleSegmentClass(item.id)}
                      />

                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: `hsl(${item.hue}, 70%, 50%)`,
                          flexShrink: 0,
                        }}
                      />

                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {!!standard.ungrouped_segment_classes.length && (
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  Без категории
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {standard.ungrouped_segment_classes.map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: disabled ? "default" : "pointer",
                        opacity: disabled ? 0.65 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(item.id)}
                        disabled={disabled}
                        onChange={() => toggleSegmentClass(item.id)}
                      />

                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: `hsl(${item.hue}, 70%, 50%)`,
                          flexShrink: 0,
                        }}
                      />

                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </QueryState>
      </Section>
    </div>
  );
}

function InspectionResultPanel({
  result,
  savedInspectionId,
  onSaved,
}: {
  result: InspectionTaskResult;
  savedInspectionId: string | null;
  onSaved: (inspectionId: string) => void;
}) {
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const saveMutation = useSaveInspection({
    mutationConfig: {
      onSuccess: (data) => {
        onSaved(data.inspection_id);
      },
    },
  });

  const effectiveInspectionId = savedInspectionId ?? result.inspection_id ?? null;
  const canSave = !effectiveInspectionId && !saveMutation.isPending;

  const handleSave = () => {
    if (!canSave) return;

    saveMutation.mutate({
      task_id: result.task_id,
      serial_number: serialNumber || null,
      notes: notes || null,
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section
        title="Результат проверки"
        side={
          <Badge type={inspectionResultBadgeType(result.status)}>
            {result.status === "passed" ? "Пройдено" : "Не пройдено"}
          </Badge>
        }
        bordered
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            Совпадений: {result.matched} / {result.total}
          </div>

          {!!result.model_name && (
            <div style={{ color: "var(--text-secondary)" }}>Модель: {result.model_name}</div>
          )}

          {result.missing.length > 0 && (
            <div style={{ color: "var(--text-secondary)" }}>
              Проблемные классы: {result.missing.join(", ")}
            </div>
          )}
        </div>
      </Section>

      <Section title="Сохранение результата" bordered>
        <div style={{ display: "grid", gap: 12 }}>
          {effectiveInspectionId ? (
            <QueryState
              isEmpty
              size="block"
              emptyTitle="Результат уже сохранён"
              emptyDescription={`ID проверки: ${effectiveInspectionId}`}
            />
          ) : (
            <>
              <Input
                label="Серийный номер"
                placeholder="Например, SN-001"
                value={serialNumber}
                onChange={setSerialNumber}
              />
              <Input
                label="Комментарий"
                placeholder="Дополнительные заметки"
                value={notes}
                onChange={setNotes}
              />
              <Button disabled={!canSave} onClick={handleSave}>
                {saveMutation.isPending ? "Сохранение..." : "Сохранить результат"}
              </Button>
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
