import { useState } from "react";
import Button from "../Button";
import ImageInput from "../ImageInput";
import Input from "../Input";
import Modal from "../Modal";
import Select from "../Select";
import { ANGLES } from "../../utils/constants";

export default function StandardCreateModal({
  isPending,
  onClose,
  onSubmit,
  title,
  submitText,
  initialName = "",
  initialImage = null,
  initialAngle = null,
}) {
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage);
  const [angle, setAngle] = useState(initialAngle);

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={isPending}
            variant="primary"
            onClick={() => onSubmit({ name, image, angle })}
          >
            {submitText}
          </Button>
        </>
      }
    >
      <>
        <Input label="Название" placeholder="Пример" value={name} onChange={setName} />
        <ImageInput label="Изображение" value={image} onChange={setImage} />
        <Select label="Ракурс" options={ANGLES} value={angle} placeholder="Выберите ракурс" onChange={setAngle} />
      </>
    </Modal>
  );
}
