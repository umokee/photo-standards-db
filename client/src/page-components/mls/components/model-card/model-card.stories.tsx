import { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { fn } from "storybook/test";

import { MlModel } from "@/types/contracts";
import { ModelCard } from "./model-card";

const baseModel = {
  id: "model-1",
  group_id: "group-1",
  name: "yolov26n-seg_v3",
  architecture: "yolov26n-seg",
  weights_path: "models/_basic/yolo26n-seg.pt",
  version: 3,
  epochs: 100,
  imgsz: 640,
  batch_size: 16,
  num_classes: 6,
  metrics: null,
  class_names: ["front", "left", "right", "back", "roof", "wheel"],
  train_ratio: 80,
  val_ratio: 10,
  test_ratio: 10,
  total_images: 120,
  train_count: 96,
  val_count: 12,
  test_count: 12,
  training_status: "pending",
  training_progress: 0,
  training_stage: null,
  training_error: null,
  training_started_at: null,
  training_finished_at: null,
  is_active: false,
  trained_at: null,
  created_at: "2026-04-12T10:00:00Z",
} satisfies MlModel;

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
      training_status: "pending",
      training_progress: 0,
      training_stage: null,
      trained_at: null,
      metrics: null,
    },
  },
};

export const Training: Story = {
  args: {
    model: {
      ...baseModel,
      training_status: "training",
      training_progress: 42,
      training_stage: "Эпоха 42/100",
      trained_at: null,
      metrics: null,
    },
  },
};

export const Saving: Story = {
  args: {
    model: {
      ...baseModel,
      training_status: "saving",
      training_progress: 100,
      training_stage: "Сохранение весов",
      trained_at: null,
      metrics: null,
    },
  },
};

export const Trained: Story = {
  args: {
    model: {
      ...baseModel,
      training_status: "done",
      trained_at: "2026-04-12T12:30:00Z",
      metrics: {
        mAP50: 0.913,
        mAP50_95: 0.644,
        precision: 0.889,
        recall: 0.861,
      },
      is_active: true,
    },
  },
};

export const Failed: Story = {
  args: {
    model: {
      ...baseModel,
      training_status: "failed",
      training_error: "CUDA out of memory",
      trained_at: null,
      metrics: null,
    },
  },
};

export const Expanded: Story = {
  args: {
    expanded: true,
    model: {
      ...baseModel,
      training_status: "done",
      trained_at: "2026-04-12T12:30:00Z",
      metrics: {
        mAP50: 0.913,
        mAP50_95: 0.644,
        precision: 0.889,
        recall: 0.861,
      },
    },
  },
};
