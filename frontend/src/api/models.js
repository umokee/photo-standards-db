import { client } from "./client";

export const getModels = async (groupId) => {
  const params = groupId ? { group_id: groupId } : {};
  const { data } = await client.get("/models", { params });
  return data;
};

export const trainModel = async (body) => {
  const { data } = await client.post("/models/train", body);
  return data;
};

export const activateModel = async (modelId) => {
  const { data } = await client.put(`/models/${modelId}/activate`);
  return data;
};
