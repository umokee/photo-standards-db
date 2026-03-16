import { client } from "./client";

export const getGroups = async () => {
  const { data } = await client.get("/groups");
  return data;
};

export const getGroup = async (id) => {
  const { data } = await client.get(`/groups/${id}`);
  return data;
};

export const createGroup = async (body) => {
  const { data } = await client.post("/groups", body);
  return data;
};

export const updateGroup = async ({ id, ...body }) => {
  const { data } = await client.put(`/groups/${id}`, body);
  return data;
};

export const deleteGroup = async (id) => {
  await client.delete(`/groups/${id}`);
};
