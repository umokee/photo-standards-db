import { useState } from "react";
import Button from "../Button";
import Input from "../Input";
import Modal from "../Modal";
import Select from "../Select";
import { ANGLES } from "../../utils/constants";

export default function StandardUpdateModal({
  isPending,
  onClose,
  onSubmit,
  title,
  submitText,
  initialName = "",
  initialAngle = "front",
}) {
  const [name, setName] = useState(initialName);
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
          <Button disabled={isPending} variant="primary" onClick={() => onSubmit({ name, angle })}>
            {submitText}
          </Button>
        </>
      }
    >
      <>
        <Input label="Название" placeholder="Пример" value={name} onChange={setName} />
        <Select label="Ракурс" placeholder="Выберите ракурс" options={ANGLES} value={angle} onChange={setAngle} />
      </>
    </Modal>
  );
}
