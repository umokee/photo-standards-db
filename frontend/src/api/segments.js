import { client } from "./client";

export const createSegment = async (body) => {
  const { data } = await client.post("/segments", body);
  return data;
};

export const updateSegment = async ({ id, ...body }) => {
  const { data } = await client.put(`/segments/${id}`, body);
  return data;
};

export const batchUpdateSegments = async (segments) => {
  const { data } = await client.put("/segments/batch", { segments });
  return data;
};

export const deleteSegment = async (id) => {
  await client.delete(`/segments/${id}`);
};
