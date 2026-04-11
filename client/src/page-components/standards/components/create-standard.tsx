import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import Select from "@/components/ui/select/select";
import { ANGLE_OPTIONS } from "@/constants";
import { getFieldError } from "@/utils/form";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useCreateStandard } from "../api/create-standard";
import { Angle } from "@/types/contracts";

export const CreateStandard = ({ groupId }: { groupId: string }) => (
  <Modal>
    <Modal.Trigger>
      <Button variant="ghost" size="sm" icon={Plus}>
        Новый эталон
      </Button>
    </Modal.Trigger>
    <Modal.Content>
      <CreateStandardModal groupId={groupId} />
    </Modal.Content>
  </Modal>
);

const CreateStandardModal = ({ groupId }: { groupId: string }) => {
  const close = useModalClose();
  const [name, setName] = useState("");
  const [angle, setAngle] = useState<Angle | null>(null);
  const mutation = useCreateStandard();

  useEffect(() => {
    if (mutation.isSuccess) {
      close();
    }
  }, [mutation.isSuccess]);

  return (
    <>
      <Modal.Header>Добавить группу</Modal.Header>
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
        <Button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ groupId, name, angle: angle ?? undefined })}
        >
          Добавить
        </Button>
      </Modal.Footer>
    </>
  );
};
