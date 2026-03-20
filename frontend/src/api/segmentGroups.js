import { client } from "./client";

export const createSegmentGroup = async ({ standardId, name, hue, orderIndex = 0 }) => {
  const { data } = await client.post("/segment-groups", {
    standard_id: standardId,
    name,
    hue,
    order_index: orderIndex,
  });
  return data;
};

export const updateSegmentGroup = async ({ id, ...body }) => {
  const { data } = await client.put(`/segment-groups/${id}`, body);
  return data;
};

export const deleteSegmentGroup = async (id) => {
  await client.delete(`/segment-groups/${id}`);
};
