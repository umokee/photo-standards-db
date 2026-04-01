import { Meta, StoryObj } from "@storybook/react";
import { Trash2 } from "lucide-react";
import Button from "./button";

const meta: Meta<typeof Button> = {
  component: Button,
  args: {
    children: "Кнопка",
    variant: "primary",
    size: "md",
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Ghost: Story = { args: { variant: "ghost" } };
export const Danger: Story = { args: { variant: "danger" } };
export const Warning: Story = { args: { variant: "warning" } };
export const WithIcon: Story = { args: { icon: Trash2 } };
export const IconOnly: Story = { args: { size: "icon", icon: Trash2, children: undefined } };
export const Disabled: Story = { args: { disabled: true } };
export const FullWidth: Story = { args: { full: true } };
