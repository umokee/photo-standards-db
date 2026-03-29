import { useState } from "react";
import Button from "../../../components/ui/button.tsx";
import Input from "../../../components/ui/input.tsx";
import Modal from "../../../components/ui/modal.tsx";

export default function CameraFormModal({
  isPending,
  onClose,
  onSubmit,
  title,
  submitText,
  initialName = "",
  initialUrl = "",
  initialLocation = "",
}) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [location, setLocation] = useState(initialLocation);

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
            onClick={() => onSubmit({ name, url, location })}
          >
            {submitText}
          </Button>
        </>
      }
    >
      <>
        <Input label="Название" placeholder="Пример" value={name} onChange={setName} />
        <Input label="URL потока" placeholder="Пример" value={url} onChange={setUrl} />
        <Input label="Расположение" placeholder="Пример" value={location} onChange={setLocation} />
      </>
    </Modal>
  );
}
