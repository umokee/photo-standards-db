import { client } from "./client";

export const getStandard = async (id) => {
  const { data } = await client.get(`/standards/${id}`);
  return data;
};

export const createStandard = async ({ groupId, name, angle }) => {
  const { data } = await client.post("/standards", {
    group_id: groupId,
    name: name || null,
    angle,
  });
  return data;
};

export const updateStandard = async ({ id, ...body }) => {
  const { data } = await client.put(`/standards/${id}`, body);
  return data;
};

export const deleteStandard = async (id) => {
  await client.delete(`/standards/${id}`);
};
