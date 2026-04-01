import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import { getFieldError } from "@/utils/form";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useCreateGroup } from "../api/create-group";

export const CreateGroup = () => (
  <Modal>
    <Modal.Trigger>
      <Button variant="ghost" full size="sm" icon={Plus}>
        Новая группа
      </Button>
    </Modal.Trigger>
    <Modal.Content>
      <CreateGroupModal />
    </Modal.Content>
  </Modal>
);

const CreateGroupModal = () => {
  const close = useModalClose();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const mutation = useCreateGroup();

  useEffect(() => {
    if (mutation.isSuccess) {
      close();
    }
  }, [mutation.isSuccess]);

  return (
    <>
      <Modal.Header>Создать группу</Modal.Header>
      <Modal.Body>
        <Input
          label="Название"
          placeholder="Пример"
          value={name}
          onChange={setName}
          error={getFieldError(mutation.error, "name")}
        />
        <Input
          label="Описание"
          placeholder="Пример"
          value={description}
          onChange={setDescription}
          error={getFieldError(mutation.error, "description")}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={close}>
          Отмена
        </Button>
        <Button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ name, description: description ?? undefined })}
        >
          Создать
        </Button>
      </Modal.Footer>
    </>
  );
};
