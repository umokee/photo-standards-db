import { InspectionPreview } from "@/page-components/inspections/components/inspection-preview";
import { InspectionTaskResult } from "@/types/contracts";
import { useOutletContext } from "react-router-dom";

type InspectionLayoutContext = {
  file: File | null;
  setFile: (file: File | null) => void;
  result: InspectionTaskResult | null;
  taskStatus: string | null;
  taskStage: string | null;
  taskProgress: number | null;
  isLocked: boolean;
};

export function Component() {
  const { file, setFile, result, taskStatus, taskStage, taskProgress, isLocked } =
    useOutletContext<InspectionLayoutContext>();

  return (
    <div style={{ height: "100%" }}>
      <InspectionPreview
        file={file}
        onFileChange={setFile}
        result={result}
        taskStatus={taskStatus}
        taskStage={taskStage}
        taskProgress={taskProgress}
        isLocked={isLocked}
      />
    </div>
  );
}
