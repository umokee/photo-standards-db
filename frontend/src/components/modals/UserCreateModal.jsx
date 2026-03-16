import { useState } from "react";
import Button from "../Button";
import Input from "../Input";
import Modal from "../Modal";
import Select from "../Select";
import { ROLES } from "../../utils/constants";

export default function UserCreateModal({ isPending, onClose, onSubmit}) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  return (
    <Modal
      title="Создать пользователя"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={isPending}
            variant="primary"
            onClick={() => onSubmit({ username, fullName, password, role })}
          >
            Создать
          </Button>
        </>
      }
    >
      <>
        <Input label="Логин" placeholder="Пример" value={username} onChange={setUsername} />
        <Input label="Полное имя" placeholder="Пример" value={fullName} onChange={setFullName} />
        <Input
          label="Пароль"
          placeholder="••••••••"
          isPassword={true}
          value={password}
          onChange={setPassword}
        />
        <Select label="Роль" options={ROLES} value={role} placeholder="Выберите роль" onChange={setRole} />
      </>
    </Modal>
  );
}
