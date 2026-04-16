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

const inspectionResultLabel = (status: string) => {
  switch (status) {
    case "passed":
      return "Пройдено";
    case "failed":
      return "Не пройдено";
    default:
      return status;
  }
};

const detailStatusLabel = (status: string) => {
  switch (status) {
    case "ok":
      return "Совпадает";
    case "less":
      return "Меньше нормы";
    case "more":
      return "Больше нормы";
    default:
      return status;
  }
};

const detailStatusBadgeType = (status: string): "info" | "success" | "warning" | "danger" => {
  switch (status) {
    case "ok":
      return "success";
    case "less":
    case "more":
      return "warning";
    default:
      return "info";
  }
};

export function Component() {
  const navigate = useNavigate();
  const { mode, groupId, standardId } = useParams();
  const currentMode = mode ?? "photo";
  const [file, setFileState] = useState<File | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionTaskResult | null>(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);

  const { data: task } = useGetTask(pendingTaskId);
  const isTaskActive = ["pending", "queued", "running"].includes(task?.status ?? "");

  const mutation = useRunInspection({
    mutationConfig: {
      onSuccess: (data) => {
        setPendingTaskId(data.task_id);
        setResult(null);
      },
    },
  });

  const setFile = (nextFile: File | null) => {
    if (isTaskActive) return;

    setFileState(nextFile);
    setPendingTaskId(null);
    setResult(null);
  };

  const isRunDisabled =
    !standardId || !file || !selectedSegmentIds.length || mutation.isPending || isTaskActive;

  const handleRun = () => {
    if (!standardId || !file || !selectedSegmentIds.length) return;

    mutation.mutate({
      standard_id: standardId,
      selected_segment_ids: selectedSegmentIds,
      mode: mode ?? "photo",
      image: file,
    });
  };

  useEffect(() => {
    if (!task) return;

    if (task.status === "succeeded" && task.result) {
      setResult(task.result as unknown as InspectionTaskResult);
      return;
    }

    if (task.status === "failed") {
      setResult(null);
    }
  }, [task]);

  useEffect(() => {
    if (ENABLED_INSPECTION_MODES.has(currentMode)) return;

    if (groupId && standardId) {
      navigate(paths.inspectionStandard("photo", groupId, standardId), { replace: true });
      return;
    }

    if (groupId) {
      navigate(paths.inspectionGroup("photo", groupId), { replace: true });
      return;
    }

    navigate(paths.inspectionMode("photo"), { replace: true });
  }, [currentMode, groupId, standardId, navigate]);

  useEffect(() => {
    setPendingTaskId(null);
    setResult(null);
    setFileState(null);
  }, [groupId, standardId]);

  return (
    <SplitLayout>
      <SplitLayout.Content>
        <SplitLayout.Topbar>
          <InspectionTopbar
            onRun={handleRun}
            runDisabled={isRunDisabled}
            runLabel={mutation.isPending || isTaskActive ? "Проверяется..." : "Проверить"}
          />
        </SplitLayout.Topbar>

        <SplitLayout.Body bare>
          <Outlet
            context={
              {
                file,
                setFile,
                result,
                taskStatus: task?.status ?? null,
                taskStage: task?.stage ?? null,
                taskProgress: task?.progress_percent ?? null,
                isLocked: isTaskActive,
              } satisfies InspectionLayoutContext
            }
          />
        </SplitLayout.Body>
      </SplitLayout.Content>

      <SplitLayout.Panel>
        <InspectionSidePanel
          groupId={groupId ?? null}
          standardId={standardId ?? null}
          taskStatus={task?.status ?? null}
          taskStage={task?.stage ?? null}
          taskError={task?.error ?? null}
          taskProgress={task?.progress_percent ?? null}
          result={result}
          selectedSegmentIds={selectedSegmentIds}
          setSelectedSegmentIds={setSelectedSegmentIds}
          isTaskActive={isTaskActive}
          onSaved={(inspectionId) => {
            setResult((current) =>
              current
                ? {
                    ...current,
                    inspection_id: inspectionId,
                  }
                : current
            );
          }}
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
  selectedSegmentIds,
  setSelectedSegmentIds,
  isTaskActive,
  onSaved,
}: {
  groupId: string | null;
  standardId: string | null;
  taskStatus: string | null;
  taskStage: string | null;
  taskError: string | null;
  taskProgress: number | null;
  result: InspectionTaskResult | null;
  selectedSegmentIds: string[];
  setSelectedSegmentIds: (value: string[]) => void;
  isTaskActive: boolean;
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
    return <InspectionResultPanel result={result} onSaved={onSaved} />;
  }

  return (
    <InspectionClassesPanel
      standardId={standardId}
      taskStatus={taskStatus}
      taskStage={taskStage}
      taskError={taskError}
      taskProgress={taskProgress}
      selectedSegmentIds={selectedSegmentIds}
      setSelectedSegmentIds={setSelectedSegmentIds}
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
  selectedSegmentIds,
  setSelectedSegmentIds,
  disabled,
}: {
  standardId: string;
  taskStatus: string | null;
  taskStage: string | null;
  taskError: string | null;
  taskProgress: number | null;
  selectedSegmentIds: string[];
  setSelectedSegmentIds: (value: string[]) => void;
  disabled: boolean;
}) {
  const { data: standard } = useGetStandardDetail(standardId);
  const [initializedStandardId, setInitializedStandardId] = useState<string | null>(null);

  useEffect(() => {
    if (initializedStandardId === standard.id) return;

    setSelectedSegmentIds(standard.segments.map((segment) => segment.id));
    setInitializedStandardId(standard.id);
  }, [initializedStandardId, standard.id, standard.segments, setSelectedSegmentIds]);

  const selectedSet = useMemo(() => new Set(selectedSegmentIds), [selectedSegmentIds]);

  const groupedSegments = standard.segment_groups.map((group) => ({
    ...group,
    segments: standard.segments.filter((segment) => segment.segment_group_id === group.id),
  }));

  const toggleSegment = (segmentId: string) => {
    if (disabled) return;

    if (selectedSet.has(segmentId)) {
      setSelectedSegmentIds(selectedSegmentIds.filter((id) => id !== segmentId));
      return;
    }

    setSelectedSegmentIds([...selectedSegmentIds, segmentId]);
  };

  const toggleGroup = (segmentIds: string[]) => {
    if (disabled) return;

    const allSelected = segmentIds.length > 0 && segmentIds.every((id) => selectedSet.has(id));

    if (allSelected) {
      setSelectedSegmentIds(selectedSegmentIds.filter((id) => !segmentIds.includes(id)));
      return;
    }

    setSelectedSegmentIds(Array.from(new Set([...selectedSegmentIds, ...segmentIds])));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {taskError && (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid #e0b3ad",
            background: "#f6e7e2",
            color: "#8b3d33",
            display: "grid",
            gap: 6,
          }}
        >
          <strong>Проверка завершилась ошибкой</strong>
          <span>{taskError}</span>
        </div>
      )}

      <Section
        title="Классы проверки"
        side={<Badge>{selectedSegmentIds.length}</Badge>}
        bordered
      >
        {disabled && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 12,
              background: "#f3eee2",
              border: "1px solid #ddd5c7",
              color: "#8a8f7a",
              display: "grid",
              gap: 4,
            }}
          >
            <strong style={{ color: "#545c45" }}>{taskStage ?? "Проверка изображения"}</strong>
            {taskProgress != null && <span>Прогресс: {taskProgress}%</span>}
            {taskStatus && <span>Выбор классов временно заблокирован</span>}
          </div>
        )}

        <div
          style={{
            display: "grid",
            borderRadius: 16,
            opacity: disabled ? 0.72 : 1,
          }}
        >
          {groupedSegments.map((group, index) => {
            const segmentIds = group.segments.map((segment) => segment.id);
            const allSelected =
              segmentIds.length > 0 && segmentIds.every((id) => selectedSet.has(id));
            const selectedCount = segmentIds.filter((id) => selectedSet.has(id)).length;

            return (
              <div
                key={group.id}
                style={{
                  display: "grid",
                  gap: 12,
                  padding: 14,
                  borderTop: index === 0 ? "none" : "1px solid #efe9dc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={disabled}
                      onChange={() => toggleGroup(segmentIds)}
                    />
                    <span>{group.name}</span>
                  </label>
                  <span style={{ color: "#8a8f7a", fontSize: 13 }}>
                    {selectedCount} из {segmentIds.length}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginLeft: 10,
                    paddingLeft: 18,
                    borderLeft: "1px solid #d8d0c2",
                  }}
                >
                  {group.segments.map((segment) => (
                    <label
                      key={segment.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        paddingBottom: 10,
                        borderBottom: "1px solid #efe9dc",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(segment.id)}
                        disabled={disabled}
                        onChange={() => toggleSegment(segment.id)}
                      />
                      <span>{segment.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function InspectionResultPanel({
  result,
  onSaved,
}: {
  result: InspectionTaskResult;
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

  useEffect(() => {
    setSerialNumber("");
    setNotes("");
  }, [result.task_id]);

  const isAlreadySaved = !!result.inspection_id;

  const handleSave = () => {
    if (isAlreadySaved) return;

    saveMutation.mutate({
      task_id: result.task_id,
      serial_number: serialNumber.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gap: 10,
          padding: 18,
          borderRadius: 18,
          border: `1px solid ${result.status === "passed" ? "#b6d1bd" : "#e0b3ad"}`,
          background: result.status === "passed" ? "#ecf5ee" : "#f6e7e2",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <Badge type={inspectionResultBadgeType(result.status)}>
              {inspectionResultLabel(result.status)}
            </Badge>
            <strong style={{ fontSize: 28, lineHeight: 1, color: "#2e3427" }}>
              {result.matched} / {result.total}
            </strong>
          </div>
          <div style={{ textAlign: "right", color: "#8a8f7a" }}>
            <div>сегментов</div>
            {result.missing.length > 0 && <div>Не найдено: {result.missing.length}</div>}
          </div>
        </div>

        {result.model_name && (
          <div style={{ color: "#8a8f7a", fontSize: 14 }}>
            Модель: <strong>{result.model_name}</strong>
          </div>
        )}
      </div>

      <Section title="Сегменты" side={`${result.matched} из ${result.total}`} bordered>
        <div style={{ display: "grid", gap: 12 }}>
          {result.details.map((detail) => {
            const ratio =
              detail.expected_count > 0
                ? Math.min(100, Math.round((detail.detected_count / detail.expected_count) * 100))
                : detail.detected_count > 0
                  ? 100
                  : 0;

            return (
              <div
                key={detail.segment_id}
                style={{
                  display: "grid",
                  gap: 8,
                  paddingBottom: 12,
                  borderBottom: "1px solid #efe9dc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge type={detailStatusBadgeType(detail.status)}>
                      {detailStatusLabel(detail.status)}
                    </Badge>
                    <strong>{detail.name}</strong>
                  </div>
                  <span style={{ color: "#8a8f7a", fontSize: 14 }}>
                    {detail.detected_count} / {detail.expected_count}
                  </span>
                </div>

                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: "#e3ddd0",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${ratio}%`,
                      height: "100%",
                      background:
                        detail.status === "ok"
                          ? "#4ba26a"
                          : detail.status === "less"
                            ? "#d6a23c"
                            : "#d4574a",
                    }}
                  />
                </div>

                <div style={{ color: "#8a8f7a", fontSize: 13 }}>
                  Delta: <strong>{detail.delta}</strong>
                  {detail.confidence != null
                    ? ` · confidence ${Math.round(detail.confidence * 100)}%`
                    : ""}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Сохранение" bordered>
        <div style={{ display: "grid", gap: 14 }}>
          <Input
            noMargin
            label="Серийный номер"
            placeholder="Введите или отсканируйте..."
            value={serialNumber}
            onChange={setSerialNumber}
            disabled={saveMutation.isPending || isAlreadySaved}
          />

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ color: "#8a8f7a", fontSize: 14, fontWeight: 600 }}>Заметки</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий к результату..."
              rows={5}
              disabled={saveMutation.isPending || isAlreadySaved}
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 12,
                border: "1px solid #d9d2c3",
                background: "#fffdf7",
                padding: 12,
                color: "#2e3427",
                font: "inherit",
              }}
            />
          </div>

          <Button disabled={saveMutation.isPending || isAlreadySaved} onClick={handleSave}>
            {saveMutation.isPending
              ? "Сохранение..."
              : isAlreadySaved
                ? "Результат сохранён"
                : "Сохранить результат"}
          </Button>
          <div style={{ color: "#8a8f7a", fontSize: 13 }}>
            {isAlreadySaved
              ? "Эта проверка уже сохранена в истории."
              : "Сохранение выполняется отдельно, после просмотра результата."}
          </div>
        </div>
      </Section>
    </div>
  );
}
