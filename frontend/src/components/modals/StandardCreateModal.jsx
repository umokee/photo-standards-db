import { useState } from "react";
import { ANGLES } from "../../utils/constants";
import Button from "../Button";
import Input from "../Input";
import Modal from "../Modal";
import Select from "../Select";

export default function StandardCreateModal({
  isPending,
  onClose,
  onSubmit,
  title,
  submitText,
  initialName = "",
  initialAngle = null,
}) {
  const [name, setName] = useState(initialName);
  const [angle, setAngle] = useState(initialAngle);

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
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
        <Select
          label="Ракурс"
          options={ANGLES}
          value={angle}
          placeholder="Выберите ракурс"
          onChange={setAngle}
        />
      </>
    </Modal>
  );
}
