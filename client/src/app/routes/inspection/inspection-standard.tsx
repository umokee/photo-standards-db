import { Section } from "@/components/layouts/section/section";
import Button from "@/components/ui/button/button";
import ImageInput from "@/components/ui/image-input/image-input";
import { useRunInspection } from "@/page-components/inspections/api/run-inspection";
import { InspectionTaskResult } from "@/types/contracts";
import { useState } from "react";
import { useLoaderData, useOutletContext, useParams } from "react-router-dom";

type InspectionLayoutContext = {
  pendingTaskId: string | null;
  setPendingTaskId: (value: string | null) => void;
  result: InspectionTaskResult | null;
  setResult: (value: InspectionTaskResult | null) => void;
  selectedSegmentIds: string[];
  setSelectedSegmentIds: (value: string[]) => void;
};

export function Component() {
  const [files, setFiles] = useState<File[] | null>(null);
  const { mode } = useParams();
  const { groupId, standardId } = useLoaderData() as {
    groupId: string;
    standardId: string;
  };

  const { selectedSegmentIds, setPendingTaskId, setResult } =
    useOutletContext<InspectionLayoutContext>();

  const mutation = useRunInspection({
    mutationConfig: {
      onSuccess: (data) => {
        setPendingTaskId(data.task_id);
        setResult(null);
      },
    },
  });

  const handleRun = () => {
    const file = files?.[0];
    if (!file) return;
    if (!selectedSegmentIds.length) return;

    mutation.mutate({
      standard_id: standardId,
      selected_segment_ids: selectedSegmentIds,
      mode: mode ?? "photo",
      image: file,
    });
  };

  return (
    <Section title="Изображение для проверки" bordered>
      <div style={{ display: "grid", gap: 16 }}>
        <ImageInput
          label="Загрузите изображение"
          value={files}
          onChange={(nextFiles) => {
            setFiles(nextFiles);
            setResult(null);
            setPendingTaskId(null);
          }}
        />

        <div style={{ color: "#8a8f7a", fontSize: 14 }}>
          Выбрано классов: <strong>{selectedSegmentIds.length}</strong>
        </div>

        <div>
          <Button
            disabled={!files?.length || !selectedSegmentIds.length || mutation.isPending}
            onClick={handleRun}
          >
            {mutation.isPending ? "Запуск..." : "Проверить"}
          </Button>
        </div>

        <div style={{ color: "#8a8f7a", fontSize: 14 }}>
          Группа: <strong>{groupId}</strong>
        </div>
      </div>
    </Section>
  );
}
