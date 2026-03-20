import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteImage, getImage, reference, uploadImage, uploadImages } from "../api/standardImages";

const GROUPS_KEY = ["groups"];
const standardKey = (id) => ["standards", id];
const imageKey = (id) => ["images", id];

export default function useStandardImages(imageId, standardId) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: GROUPS_KEY });
    if (imageId) qc.invalidateQueries({ queryKey: imageKey(imageId) });
    if (standardId) qc.invalidateQueries({ queryKey: standardKey(standardId) });
  };

  const imageQuery = useQuery({
    queryKey: imageKey(imageId),
    queryFn: () => getImage(imageId),
    enabled: !!imageId,
    staleTime: 30_000,
  });

  const setReference = useMutation({
    mutationFn: reference,
    onSuccess: () => invalidate(),
  });

  const upload = useMutation({
    mutationFn: uploadImage,
    onSuccess: () => invalidate(),
  });

  const uploadBatch = useMutation({
    mutationFn: uploadImages,
    onSuccess: () => invalidate(),
  });

  const remove = useMutation({
    mutationFn: deleteImage,
    onSuccess: () => invalidate(),
  });

  return {
    image: imageQuery.data ?? null,
    status: {
      isLoading: imageQuery.isLoading,
      isError: imageQuery.isError,
    },
    upload,
    uploadBatch,
    remove,
    setReference,
  };
}
