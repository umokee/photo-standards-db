import { client } from "./client";

export const refineContour = async ({ imageId, points, epsilon, padding }) => {
  const { data } = await client.post("/segments/refine", {
    image_id: imageId,
    points,
    epsilon: epsilon ?? 2.0,
    padding: padding ?? 50,
  });
  return data;
};

export const createSegment = async ({ standardId, segmentGroupId, label }) => {
  const { data } = await client.post("/segments", {
    standard_id: standardId,
    segment_group_id: segmentGroupId || null,
    label,
  });
  return data;
};

export const updateSegment = async ({ id, ...body }) => {
  const { data } = await client.put(`/segments/${id}`, body);
  return data;
};

export const saveAnnotation = async ({ segmentId, imageId, points }) => {
  const { data } = await client.put(`/segments/${segmentId}/annotations/${imageId}`, { points });
  return data;
};

export const deleteSegment = async (id) => {
  await client.delete(`/segments/${id}`);
};
