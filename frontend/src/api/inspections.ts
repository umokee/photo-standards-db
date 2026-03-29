import { client } from "./client";

export const runInspection = async ({ standard_id, mode, image }) => {
  const form = new FormData();
  form.append("standard_id", standard_id);
  form.append("mode", mode);
  form.append("image", image);
  const { data } = await client.post("/inspections/run", form);
  return data;
};
