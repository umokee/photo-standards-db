import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import { useRunInspection } from "@/page-components/inspections/api/run-inspection";
import { InspectionSidePanel } from "@/page-components/inspections/components/inspection-side-panel/inspection-side-panel";
import { InspectionTopbar } from "@/page-components/inspections/components/inspection-topbar/inspection-topbar";
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
