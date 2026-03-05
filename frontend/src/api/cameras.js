import { client } from "./client";

export const getCameras = () => client.get("/cameras").then((res) => res.data);

export const createCamera = (data) => client.post("/cameras", data).then((res) => res.data);

export const updateCamera = ({ id, ...data }) =>
  client.put(`/cameras/${id}`, data).then((res) => res.data);

export const deleteCamera = (id) => client.delete(`/cameras/${id}`).then((res) => res.data);
