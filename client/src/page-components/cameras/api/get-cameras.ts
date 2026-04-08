import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Camera } from "@/types/contracts";
import { useQuery } from "@tanstack/react-query";

export const getCameras = (): Promise<Camera[]> => {
  return client.get("/cameras");
};

export const getCamerasQueryOptions = () => {
  return {
    queryKey: queryKeys.cameras.all(),
    queryFn: getCameras,
  };
};

export const useGetCameras = () => useQuery({ ...getCamerasQueryOptions() });
