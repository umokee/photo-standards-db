import Button from "@/components/ui/button/button";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useDeleteStandard } from "../api/delete-standard";

interface Props {
  id: string;
  name: string;
}

export const DeleteStandard = ({ id, name }: Props) => (
  <Modal>
    <Modal.Trigger>
      <Button variant="danger" size="icon" icon={Trash2} />
    </Modal.Trigger>
    <Modal.Content>
      <DeleteStandardModal id={id} name={name} />
    </Modal.Content>
  </Modal>
);

const DeleteStandardModal = ({ id, name }: Props) => {
  const close = useModalClose();
  const mutation = useDeleteStandard();

  useEffect(() => {
    if (mutation.isSuccess) {
      close();
    }
  }, [mutation.isSuccess]);

  return (
    <>
      <Modal.Header>Удалить эталон</Modal.Header>
      <Modal.Body>{`Вы уверены, что хотите удалить <${name}>?`}</Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={close}>
          Отмена
        </Button>
        <Button variant="danger" disabled={mutation.isPending} onClick={() => mutation.mutate(id)}>
          Удалить
        </Button>
      </Modal.Footer>
    </>
  );
};
