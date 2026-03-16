import { client } from "./client";

export const getUsers = async () => {
  const { data } = await client.get("/users");
  return data;
};

export const createUser = async (body) => {
  const { data } = await client.post("/users", body);
  return data;
};

export const updateUser = async ({ id, ...body }) => {
  const { data } = await client.put(`/users/${id}`, body);
  return data;
};

export const deleteUser = async (id) => {
  await client.delete(`/users/${id}`);
};
