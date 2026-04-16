import { Section } from "@/components/layouts/section/section";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import QueryState from "@/components/ui/query-state/query-state";
import Select from "@/components/ui/select/select";
import { useInspectionModeOptions } from "@/constants";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { useGetTask } from "@/page-components/tasks/api/get-task";
import { InspectionTaskResult } from "@/types/contracts";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { paths } from "../../paths";

type InspectionLayoutContext = {
  pendingTaskId: string | null;
  setPendingTaskId: (value: string | null) => void;
  result: InspectionTaskResult | null;
  setResult: (value: InspectionTaskResult | null) => void;
  selectedSegmentIds: string[];
  setSelectedSegmentIds: (value: string[]) => void;
};

export function Component() {
  const { groupId, standardId } = useParams();
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionTaskResult | null>(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);

  const { data: task } = useGetTask(pendingTaskId);

  useEffect(() => {
    if (!task) return;

    if (task.status === "succeeded" && task.result) {
      setResult(task.result as unknown as InspectionTaskResult);
    }

    if (task.status === "failed") {
      setResult(null);
    }
  }, [task]);

  useEffect(() => {
    setPendingTaskId(null);
    setResult(null);
  }, [groupId, standardId]);

  return (
    <SplitLayout>
      <SplitLayout.Content>
        <SplitLayout.Topbar>
          <InspectionTopbar />
        </SplitLayout.Topbar>

        <SplitLayout.Body>
          <Outlet
            context={
              {
                pendingTaskId,
                setPendingTaskId,
                result,
                setResult,
                selectedSegmentIds,
                setSelectedSegmentIds,
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
        />
      </SplitLayout.Panel>
    </SplitLayout>
  );
}

const InspectionTopbar = () => {
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
        gridTemplateColumns: "auto minmax(220px, 280px) minmax(220px, 280px)",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {modeOptions.map((option) => {
          const isActive = option.value === currentMode;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleModeChange(option.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #d6d0c4",
                background: isActive ? "#e8e1d2" : "#fffaf0",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
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

  return (
    <InspectionClassesPanel
      standardId={standardId}
      taskStatus={taskStatus}
      taskStage={taskStage}
      taskError={taskError}
      taskProgress={taskProgress}
      result={result}
      selectedSegmentIds={selectedSegmentIds}
      setSelectedSegmentIds={setSelectedSegmentIds}
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
  result,
  selectedSegmentIds,
  setSelectedSegmentIds,
}: {
  standardId: string;
  taskStatus: string | null;
  taskStage: string | null;
  taskError: string | null;
  taskProgress: number | null;
  result: InspectionTaskResult | null;
  selectedSegmentIds: string[];
  setSelectedSegmentIds: (value: string[]) => void;
}) {
  const { data: standard } = useGetStandardDetail(standardId);

  useEffect(() => {
    setSelectedSegmentIds(standard.segments.map((segment) => segment.id));
  }, [standard.id, standard.segments, setSelectedSegmentIds]);

  const selectedSet = useMemo(() => new Set(selectedSegmentIds), [selectedSegmentIds]);

  const detailsBySegmentId = useMemo(() => {
    return new Map(result?.details.map((item) => [item.segment_id, item]) ?? []);
  }, [result]);

  const groupedSegments = standard.segment_groups.map((group) => ({
    ...group,
    segments: standard.segments.filter((segment) => segment.segment_group_id === group.id),
  }));

  const toggleSegment = (segmentId: string) => {
    if (selectedSet.has(segmentId)) {
      setSelectedSegmentIds(selectedSegmentIds.filter((id) => id !== segmentId));
      return;
    }

    setSelectedSegmentIds([...selectedSegmentIds, segmentId]);
  };

  const toggleGroup = (segmentIds: string[]) => {
    const allSelected = segmentIds.length > 0 && segmentIds.every((id) => selectedSet.has(id));

    if (allSelected) {
      setSelectedSegmentIds(selectedSegmentIds.filter((id) => !segmentIds.includes(id)));
      return;
    }

    setSelectedSegmentIds(Array.from(new Set([...selectedSegmentIds, ...segmentIds])));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section title="Состояние проверки" bordered>
        {taskStatus ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              Статус: <strong>{taskStatus}</strong>
            </div>
            {taskStage && (
              <div>
                Этап: <strong>{taskStage}</strong>
              </div>
            )}
            {taskProgress != null && (
              <div>
                Прогресс: <strong>{taskProgress}%</strong>
              </div>
            )}
            {taskError && (
              <div>
                Ошибка: <strong>{taskError}</strong>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: "#8a8f7a" }}>Проверка ещё не запускалась.</div>
        )}
      </Section>

      <Section title="Классы проверки" bordered>
        <div style={{ display: "grid", gap: 14 }}>
          {groupedSegments.map((group) => {
            const segmentIds = group.segments.map((segment) => segment.id);
            const allSelected =
              segmentIds.length > 0 && segmentIds.every((id) => selectedSet.has(id));

            return (
              <div
                key={group.id}
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 12,
                  border: "1px solid #ddd5c7",
                  borderRadius: 12,
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
                    onChange={() => toggleGroup(segmentIds)}
                  />
                  <span>{group.name}</span>
                </label>

                <div style={{ display: "grid", gap: 8, paddingLeft: 24 }}>
                  {group.segments.map((segment) => {
                    const detail = detailsBySegmentId.get(segment.id);

                    return (
                      <label
                        key={segment.id}
                        style={{
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedSet.has(segment.id)}
                            onChange={() => toggleSegment(segment.id)}
                          />
                          <span>{segment.name}</span>
                        </span>

                        {detail && (
                          <span style={{ color: "#8a8f7a", fontSize: 13, paddingLeft: 26 }}>
                            {detail.detected_count} / {detail.expected_count} · {detail.status}
                            {detail.confidence != null
                              ? ` · ${Math.round(detail.confidence * 100)}%`
                              : ""}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
