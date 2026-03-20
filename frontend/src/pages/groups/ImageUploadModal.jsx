import { useState } from "react";
import Button from "../../components/Button";
import ImageInput from "../../components/ImageInput";
import Modal from "../../components/Modal";

export default function ImageUploadModal({ isPending, onClose, onUpload }) {
  const [images, setImages] = useState(null);

  return (
    <Modal
      title="Загрузить изображение"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={isPending || !images?.length}
            variant="primary"
            onClick={() => onUpload(images)}
          >
            Загрузить
          </Button>
        </>
      }
    >
      <ImageInput multiple value={images} onChange={setImages} />
    </Modal>
  );
}
