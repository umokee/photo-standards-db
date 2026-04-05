import { Meta, StoryObj } from "@storybook/react";
import { Notification } from "./notification";

const meta: Meta<typeof Notification> = {
  component: Notification,
  args: {
    notification: {
      id: "1",
      title: "Уведомление",
      message: "Текст уведомления",
      type: "success",
    },
  },
};
export default meta;

type Story = StoryObj<typeof Notification>;

export const Success: Story = {};
