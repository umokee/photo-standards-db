import { client } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { StandardImageDetail } from "@/types/contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const getImage = (id: string): Promise<StandardImageDetail> => {
  return client.get(`/standards/images/${id}`);
};

export const getImageQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: queryKeys.standards.image(id),
    queryFn: () => getImage(id),
    enabled: !!id,
  });
};

export const defaultImage: StandardImageDetail = {
  id: "",
  standard_id: "",
  image_path: "",
  is_reference: false,
  annotation_count: 0,
  created_at: "",
  segments: [],
};

export const useGetImage = (id: string | null) => {
  return useQuery({ ...getImageQueryOptions(id!) });
};
