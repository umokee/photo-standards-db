import { useQuery } from "@tanstack/react-query";
import { getStandard } from "../api/standards";

const standardKey = (id) => ["standards", id];

export default function useStandardDetail(id, { enabled }) {
  const query = useQuery({
    queryKey: standardKey(id),
    queryFn: () => getStandard(id),
    enabled: !!id && enabled,
  });

  return {
    standard: query.data,
    status: {
      isLoading: query.isLoading,
      isError: query.isError,
    },
  };
}
