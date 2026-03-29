import Button from "@/components/ui/button/button";
import ImageInput from "@/components/ui/image-input/image-input";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useUploadImages } from "../api/upload-images";

export const UploadImages = ({ standardId }: { standardId: string }) => (
  <Modal>
    <Modal.Trigger>
      <Button variant="ghost" size="sm" icon={Upload}>
        Фото
      </Button>
    </Modal.Trigger>
    <Modal.Content>
      <UploadImagesModal standardId={standardId} />
    </Modal.Content>
  </Modal>
);

const UploadImagesModal = ({ standardId }: { standardId: string }) => {
  const close = useModalClose();
  const [images, setImages] = useState<File[] | null>(null);
  const mutation = useUploadImages({
    mutationConfig: {
      onSuccess: () => setImages(null),
    },
  });

  useEffect(() => {
    if (mutation.isSuccess) {
      close();
    }
  }, [mutation.isSuccess]);

  const handleSubmit = () => {
    if (!images?.length) return;
    mutation.mutate({ standardId, images });
  };

  return (
    <>
      <Modal.Header>Загрузить изображения</Modal.Header>
      <Modal.Body>
        <ImageInput
          multiple
          value={images}
          onChange={(val) => setImages(val ? (val as File[]) : null)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button disabled={mutation.isPending || !images?.length} onClick={handleSubmit}>
          Загрузить
        </Button>
      </Modal.Footer>
    </>
  );
};
