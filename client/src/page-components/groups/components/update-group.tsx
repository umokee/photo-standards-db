import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import { GroupDetail } from "@/types/contracts";
import { getChangedFields, getFieldError } from "@/utils/form";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useUpdateGroup } from "../api/update-group";

export const UpdateGroup = ({ group }: { group: GroupDetail }) => (
  <Modal>
    <Modal.Trigger>
      <Button variant="ghost" size="icon" icon={Pencil} />
    </Modal.Trigger>
    <Modal.Content>
      <UpdateGroupModal group={group} />
    </Modal.Content>
  </Modal>
);

const UpdateGroupModal = ({ group }: { group: GroupDetail }) => {
  const close = useModalClose();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const mutation = useUpdateGroup();

  useEffect(() => {
    if (mutation.isSuccess) {
      close();
    }
  }, [mutation.isSuccess]);

  const handleSubmit = () => {
    const changed = getChangedFields(
      { name, description },
      { name: group.name, description: group.description ?? "" }
    );
    if (!changed) return;
    mutation.mutate({ id: group.id, data: changed });
  };

  return (
    <>
      <Modal.Header>{`Изменить группу ${group.name}`}</Modal.Header>
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
        <Button disabled={mutation.isPending} onClick={handleSubmit}>
          Cохранить
        </Button>
      </Modal.Footer>
    </>
  );
};
