import StandardItem from "./StandardItem";

export const Default = (args) => {
  return <StandardItem standard={args.standard} />;
};

Default.args = {
  standard: {
    id: 1,
    name: "Стандарт 1",
    angle: "front",
    is_active: true,
    images: [
      { id: 1, image_path: "image.jpg", is_reference: true, segment_count: 3 },
      { id: 2, image_path: "image.jpg", is_reference: false, segment_count: 3 },
      { id: 3, image_path: "image.jpg", is_reference: false, segment_count: 0 },
    ],
  },
};
