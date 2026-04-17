import { MlModel, TaskResponse } from "@/types/contracts";
import { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { fn } from "storybook/test";
import { ModelCard } from "./model-card";

const baseModel = {
  id: "model-1",
  group_id: "group-1",
  architecture: "yolov26n-seg",
  weights_path: "models/_basic/yolo26n-seg.pt",
  version: 3,
  epochs: 100,
  imgsz: 640,
  batch_size: 16,
  num_classes: 6,
  metrics: null,
  class_keys: ["front-id", "left-id", "right-id", "back-id", "roof-id", "wheel-id"],
  class_meta: [
    { id: "front-id", key: "front-id", name: "front", index: 0, class_group_id: null },
    { id: "left-id", key: "left-id", name: "left", index: 1, class_group_id: null },
    { id: "right-id", key: "right-id", name: "right", index: 2, class_group_id: null },
    { id: "back-id", key: "back-id", name: "back", index: 3, class_group_id: null },
    { id: "roof-id", key: "roof-id", name: "roof", index: 4, class_group_id: null },
    { id: "wheel-id", key: "wheel-id", name: "wheel", index: 5, class_group_id: null },
  ],
  train_ratio: 80,
  val_ratio: 10,
  test_ratio: 10,
  total_images: 120,
  train_count: 96,
  val_count: 12,
  test_count: 12,
  is_active: false,
  trained_at: null,
  created_at: "2026-04-12T10:00:00Z",
} satisfies MlModel;

const baseTask = {
  id: "task-1",
  type: "model_training",
  status: "pending",
  queue: "training",
  priority: 100,
  progress_current: 0,
  progress_total: 100,
  progress_percent: 0,
  stage: null,
  message: null,
  error: null,
  payload: null,
  result: null,
  entity_type: "ml_model",
  entity_id: baseModel.id,
  group_id: baseModel.group_id,
  external_job_id: null,
  created_at: "2026-04-12T10:00:00Z",
  started_at: null,
  finished_at: null,
  cancelled_at: null,
} satisfies TaskResponse;

const meta: Meta<typeof ModelCard> = {
  title: "ML/ModelCard",
  component: ModelCard,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 760, padding: 16, background: "#f5f3ee" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    model: baseModel,
    task: null,
    expanded: false,
    onToggle: fn(),
  },
  render: (args) => {
    const [expanded, setExpanded] = useState(args.expanded);

    return (
      <ModelCard
        {...args}
        expanded={expanded}
        onToggle={() => {
          args.onToggle();
          setExpanded((prev) => !prev);
        }}
      />
    );
  },
};

export default meta;

type Story = StoryObj<typeof ModelCard>;

export const Pending: Story = {
  args: {
    model: {
      ...baseModel,
      trained_at: null,
      metrics: null,
    },
    task: {
      ...baseTask,
      status: "pending",
      progress_percent: 0,
      stage: null,
    },
  },
};

export const Training: Story = {
  args: {
    model: {
      ...baseModel,
      trained_at: null,
      metrics: null,
    },
    task: {
      ...baseTask,
      status: "running",
      progress_current: 42,
      progress_total: 100,
      progress_percent: 42,
      stage: "Эпоха 42/100",
    },
  },
};

export const Saving: Story = {
  args: {
    model: {
      ...baseModel,
      trained_at: null,
      metrics: null,
    },
    task: {
      ...baseTask,
      status: "running",
      progress_current: 100,
      progress_total: 100,
      progress_percent: 100,
      stage: "Сохранение весов",
    },
  },
};

export const Trained: Story = {
  args: {
    model: {
      ...baseModel,
      trained_at: "2026-04-12T12:30:00Z",
      metrics: {
        mAP50: 0.913,
        mAP50_95: 0.644,
        precision: 0.889,
        recall: 0.861,
      },
      is_active: true,
    },
    task: null,
  },
};

export const Failed: Story = {
  args: {
    model: {
      ...baseModel,
      trained_at: null,
      metrics: null,
    },
    task: {
      ...baseTask,
      status: "failed",
      error: "CUDA out of memory",
      progress_percent: 42,
      stage: "Ошибка обучения",
    },
  },
};

export const Expanded: Story = {
  args: {
    expanded: true,
    model: {
      ...baseModel,
      trained_at: "2026-04-12T12:30:00Z",
      metrics: {
        mAP50: 0.913,
        mAP50_95: 0.644,
        precision: 0.889,
        recall: 0.861,
      },
    },
    task: null,
  },
};
