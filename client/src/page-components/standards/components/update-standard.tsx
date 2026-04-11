import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import Select from "@/components/ui/select/select";
import { Angle, GroupStandard } from "@/types/contracts";
import { ANGLE_OPTIONS } from "@/constants";
import { getChangedFields, getFieldError } from "@/utils/form";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useUpdateStandard } from "../api/update-standard";

type EditableStandard = Pick<GroupStandard, "id" | "name" | "angle">;

export const UpdateStandard = ({ standard }: { standard: EditableStandard }) => (
  <Modal>
    <Modal.Trigger>
      <Button variant="ghost" size="icon" icon={Pencil} />
    </Modal.Trigger>
    <Modal.Content>
      <UpdateStandardModal standard={standard} />
    </Modal.Content>
  </Modal>
);

const UpdateStandardModal = ({ standard }: { standard: EditableStandard }) => {
  const close = useModalClose();
  const [name, setName] = useState(standard.name);
  const [angle, setAngle] = useState<Angle | null>(standard.angle);
  const mutation = useUpdateStandard();

  useEffect(() => {
    if (mutation.isSuccess) {
      close();
    }
  }, [mutation.isSuccess]);

  const handleSubmit = () => {
    const changed = getChangedFields(
      { name, angle },
      { name: standard.name, angle: standard.angle }
    );
    if (!changed) return;
    mutation.mutate({ id: standard.id, data: changed });
  };

  return (
    <>
      <Modal.Header>{`Изменить эталон ${standard.name}`}</Modal.Header>
      <Modal.Body>
        <Input
          label="Название"
          placeholder="Пример"
          value={name}
          onChange={setName}
          error={getFieldError(mutation.error, "name")}
        />
        <Select
          label="Ракурс"
          options={ANGLE_OPTIONS}
          value={angle ?? ""}
          placeholder="Выберите ракурс"
          onChange={(val) => setAngle(val ? (val as Angle) : null)}
          error={getFieldError(mutation.error, "angle")}
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
