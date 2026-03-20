import { client } from "./client";

export const uploadImage = async ({ standardId, image, isReference = false }) => {
  const form = new FormData();
  form.append("image", image);
  form.append("is_reference", isReference);
  const { data } = await client.post(`/standards/${standardId}/images`, form);
  return data;
};

export const uploadImages = async ({ standardId, images }) => {
  const form = new FormData();
  images.forEach((image) => form.append("images", image));
  const { data } = await client.post(`/standards/${standardId}/images/batch`, form);
  return data;
};

export const reference = async (imageId) => {
  const { data } = await client.patch(`/images/${imageId}/reference`);
  return data;
};

export const getImage = async (imageId) => {
  const { data } = await client.get(`/images/${imageId}`);
  return data;
};

export const deleteImage = async (imageId) => {
  await client.delete(`/images/${imageId}`);
};
