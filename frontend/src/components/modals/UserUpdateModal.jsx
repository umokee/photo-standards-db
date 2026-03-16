import { useState } from "react";
import Button from "../Button";
import Input from "../Input";
import Modal from "../Modal";
import Select from "../Select";
import Toggle from "../Toggle";
import { ROLES } from "../../utils/constants";

export default function UserUpdateModal({
  isPending,
  onClose,
  onSubmit,
  title,
  initialUsername = "",
  initialFullName = "",
  initialRole = "",
}) {
  const [username, setUsername] = useState(initialUsername);
  const [fullName, setFullName] = useState(initialFullName);
  const [updatePassword, setUpdatePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialRole);

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
            onClick={() =>
              onSubmit({
                username,
                fullName,
                role,
                ...(updatePassword && password ? { password } : {}),
              })
            }
          >
            Сохранить
          </Button>
        </>
      }
    >
      <>
        <Input label="Логин" placeholder="Пример" value={username} onChange={setUsername} />
        <Input label="Полное имя" placeholder="Пример" value={fullName} onChange={setFullName} />
        <Select label="Роль" options={ROLES} value={role} placeholder="Выберите роль" onChange={setRole} />
        <Toggle label="Обновить пароль" checked={updatePassword} onChange={setUpdatePassword} />
        {updatePassword && (
          <Input
            label="Пароль"
            placeholder="••••••••"
            isPassword={true}
            value={password}
            onChange={setPassword}
          />
        )}
      </>
    </Modal>
  );
}
