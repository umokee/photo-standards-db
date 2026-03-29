import { client } from "@/lib/api-client";
import { Camera } from "@/types/api";
import { useQuery } from "@tanstack/react-query";

export const getCameras = (): Promise<Camera[]> => {
  return client.get("/cameras");
};

export const getCamerasQueryOptions = () => {
  return {
    queryKey: ["cameras"],
    queryFn: getCameras,
  };
};

export const useCameras = () => useQuery({ ...getCamerasQueryOptions() });
