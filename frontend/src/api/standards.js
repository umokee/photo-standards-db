import { client } from "./client";

export const getStandard = async (id) => {
  const { data } = await client.get(`/standards/${id}`);
  return data;
};

export const createStandard = async ({ selectedId, name, image, angle }) => {
  const form = new FormData();
  form.append("group_id", selectedId);
  if (name) form.append("name", name);
  form.append("image", image);
  form.append("angle", angle);
  const { data } = await client.post("/standards", form);
  return data;
};

export const updateStandard = async ({ id, ...body }) => {
  const { data } = await client.put(`/standards/${id}`, body);
  return data;
};

export const deleteStandard = async (id) => {
  await client.delete(`/standards/${id}`);
};
