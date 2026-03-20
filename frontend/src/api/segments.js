import { client } from "./client";

export const createSegment = async ({ imageId, segmentGroupId, label, points }) => {
  const { data } = await client.post("/segments", {
    image_id: imageId,
    segment_group_id: segmentGroupId || null,
    label,
    points,
  });
  return data;
};

export const updateSegment = async ({ id, ...body }) => {
  const { data } = await client.put(`/segments/${id}`, body);
  return data;
};

export const deleteSegment = async (id) => {
  await client.delete(`/segments/${id}`);
};
