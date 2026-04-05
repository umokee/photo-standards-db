import { Meta, StoryObj } from "@storybook/react";
import { ContentHeader } from "./content-header";

const meta: Meta<typeof ContentHeader.Top> = {
  component: ContentHeader.Top,
  args: {
    children: "Кнопка",
    title: "Заголовок",
    subtitles: ["1", "2"],
    meta: ["3", "4"],
  },
};
export default meta;

type Story = StoryObj<typeof ContentHeader.Top>;

export const Main: Story = {};
