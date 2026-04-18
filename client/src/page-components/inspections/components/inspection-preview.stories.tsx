import { InspectionTaskResult } from "@/types/contracts";
import { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { InspectionPreview } from "./inspection-preview";

const SHAPES_IMAGE_PATH =
  "/storage/standards/b768367d-7dd0-42d6-99e3-d20a48a53f8a/863b3856-82c1-401e-82f2-d2cb6be78f9e.jpg";

type InspectionPreviewStoryProps = {
  result: InspectionTaskResult | null;
  taskStatus: string | null;
  taskStage: string | null;
  taskProgress: number | null;
  isLocked: boolean;
  imagePath?: string | null;
};

const bboxResult = {
  task_id: "task-preview-bbox",
  inspection_id: null,
  status: "failed",
  matched: 2,
  total: 4,
  missing: ["Лучевая звезда", "Клевер"],
  mode: "photo",
  model_name: "storybook-mock",
  debug: null,
  details: [
    {
      segment_class_id: "diamond",
      segment_class_group_id: "top-row",
      class_key: "diamond",
      name: "Ромб",
      hue: 24,
      expected_count: 1,
      detected_count: 1,
      delta: 0,
      status: "ok",
      confidence: 0.96,
      detections: [
        {
          confidence: 0.96,
          bbox: { x: 82, y: 24, w: 190, h: 190 },
          polygon: null,
        },
      ],
    },
    {
      segment_class_id: "four-point-star",
      segment_class_group_id: "top-row",
      class_key: "four-point-star",
      name: "Звезда (4 луча)",
      hue: 276,
      expected_count: 1,
      detected_count: 1,
      delta: 0,
      status: "ok",
      confidence: 0.91,
      detections: [
        {
          confidence: 0.91,
          bbox: { x: 950, y: 28, w: 180, h: 170 },
          polygon: null,
        },
      ],
    },
    {
      segment_class_id: "burst",
      segment_class_group_id: "bottom-row",
      class_key: "burst",
      name: "Лучевая звезда",
      hue: 2,
      expected_count: 1,
      detected_count: 0,
      delta: -1,
      status: "less",
      confidence: null,
      detections: [],
    },
    {
      segment_class_id: "clover",
      segment_class_group_id: "bottom-row",
      class_key: "clover",
      name: "Клевер",
      hue: 126,
      expected_count: 1,
      detected_count: 0,
      delta: -1,
      status: "less",
      confidence: null,
      detections: [],
    },
  ],
} satisfies InspectionTaskResult;

const polygonResult = {
  task_id: "task-preview-polygon",
  inspection_id: null,
  status: "failed",
  matched: 1,
  total: 3,
  missing: ["Клевер"],
  mode: "photo",
  model_name: "storybook-mock",
  debug: null,
  details: [
    {
      segment_class_id: "cross",
      segment_class_group_id: "middle-row",
      class_key: "cross",
      name: "Крест",
      hue: 208,
      expected_count: 1,
      detected_count: 1,
      delta: 0,
      status: "ok",
      confidence: 0.9,
      detections: [
        {
          confidence: 0.9,
          bbox: { x: 315, y: 255, w: 250, h: 210 },
          polygon: [
            [400, 255],
            [515, 305],
            [450, 463],
            [315, 365],
          ],
        },
      ],
    },
    {
      segment_class_id: "clover",
      segment_class_group_id: "bottom-row",
      class_key: "clover",
      name: "Клевер",
      hue: 138,
      expected_count: 1,
      detected_count: 2,
      delta: 1,
      status: "more",
      confidence: 0.83,
      detections: [
        {
          confidence: 0.86,
          bbox: { x: 350, y: 500, w: 260, h: 220 },
          polygon: [
            [470, 505],
            [560, 565],
            [520, 690],
            [388, 705],
            [320, 600],
            [365, 535],
          ],
        },
        {
          confidence: 0.8,
          bbox: { x: 980, y: 520, w: 180, h: 190 },
          polygon: [
            [1010, 540],
            [1120, 522],
            [1160, 615],
            [1110, 716],
            [992, 694],
            [960, 603],
          ],
        },
      ],
    },
    {
      segment_class_id: "spark",
      segment_class_group_id: "bottom-row",
      class_key: "spark",
      name: "Лучевая звезда",
      hue: 12,
      expected_count: 1,
      detected_count: 1,
      delta: 0,
      status: "extra",
      confidence: 0.74,
      detections: [
        {
          confidence: 0.74,
          bbox: { x: 690, y: 520, w: 210, h: 195 },
          polygon: [
            [780, 520],
            [828, 560],
            [900, 572],
            [844, 620],
            [862, 698],
            [780, 665],
            [700, 695],
            [720, 618],
            [658, 565],
            [734, 557],
          ],
        },
      ],
    },
  ],
} satisfies InspectionTaskResult;

const loadStoryFile = async (imagePath: string): Promise<File> => {
  const response = await fetch(imagePath);
  const blob = await response.blob();
  const filename = imagePath.split("/").pop() ?? "inspection-reference.jpg";

  return new File([blob], filename, { type: blob.type || "image/jpeg" });
};

const InspectionPreviewHarness = ({
  imagePath = SHAPES_IMAGE_PATH,
  result,
  taskStatus,
  taskStage,
  taskProgress,
  isLocked,
}: InspectionPreviewStoryProps) => {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    let isDisposed = false;

    if (!imagePath) {
      setFile(null);
      return;
    }

    void loadStoryFile(imagePath)
      .then((nextFile) => {
        if (!isDisposed) {
          setFile(nextFile);
        }
      })
      .catch(() => {
        if (!isDisposed) {
          setFile(null);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [imagePath]);

  return (
    <div
      style={{
        width: 980,
        height: 860,
        padding: 16,
        background: "#f5f3ee",
      }}
    >
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
};

const meta = {
  title: "Inspection/InspectionPreview",
  component: InspectionPreviewHarness,
  args: {
    imagePath: SHAPES_IMAGE_PATH,
    result: null,
    taskStatus: null,
    taskStage: null,
    taskProgress: null,
    isLocked: false,
  },
  argTypes: {
    imagePath: {
      control: false,
    },
  },
} satisfies Meta<typeof InspectionPreviewHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    imagePath: null,
  },
};

export const Running: Story = {
  args: {
    taskStatus: "running",
    taskStage: "Проверка по активной модели",
    taskProgress: 62,
    isLocked: true,
  },
};

export const WithBoundingBoxes: Story = {
  args: {
    result: bboxResult,
    taskStatus: "succeeded",
    taskStage: "Проверка завершена",
    taskProgress: 100,
    isLocked: false,
  },
};

export const WithPolygons: Story = {
  args: {
    result: polygonResult,
    taskStatus: "succeeded",
    taskStage: "Распознано несколько контуров",
    taskProgress: 100,
    isLocked: false,
  },
};
