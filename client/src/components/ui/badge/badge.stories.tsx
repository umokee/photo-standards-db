import { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  component: Badge,
  args: {
    children: "Текст",
    type: "info",
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Info: Story = {};
export const Success: Story = { args: { type: "success" } };
export const Warning: Story = { args: { type: "warning" } };
export const Danger: Story = { args: { type: "danger" } };
export const WithColorDot: Story = { args: { colorDot: 120 } };
