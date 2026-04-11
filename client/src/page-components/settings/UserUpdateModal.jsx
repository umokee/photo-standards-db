import { ROLES_OPTIONS } from "@/constants.ts";
import { useState } from "react";
import Button from "../../components/ui/button.tsx";
import Input from "../../components/ui/input.tsx";
import Modal from "../../components/ui/modal.tsx";
import Select from "../../components/ui/select.tsx";
import Toggle from "../../components/ui/toggle.tsx";

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
        <Select
          label="Роль"
          options={ROLES_OPTIONS}
          value={role}
          placeholder="Выберите роль"
          onChange={setRole}
        />
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
