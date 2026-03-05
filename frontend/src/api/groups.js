import { client } from "./client";

export const getGroups = () => client.get("/groups").then((res) => res.data);

export const createGroup = (data) => client.post("/groups", data).then((res) => res.data);

export const updateGroup = ({ id, ...data }) =>
  client.put(`/groups/${id}`, data).then((res) => res.data);

export const deleteGroup = (id) => client.delete(`/groups/${id}`).then((res) => res.data);
