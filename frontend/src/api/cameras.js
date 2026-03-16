import { client } from "./client";

export const getCameras = async () => {
  const { data } = await client.get("/cameras");
  return data;
};

export const createCamera = async (body) => {
  const { data } = await client.post("/cameras", body);
  return data;
};

export const updateCamera = async ({ id, ...body }) => {
  const { data } = await client.put(`/cameras/${id}`, body);
  return data;
};

export const deleteCamera = async (id) => {
  await client.delete(`/cameras/${id}`);
};
