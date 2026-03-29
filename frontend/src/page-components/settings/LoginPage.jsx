import { useState } from "react";
import Input from "../components/ui/Input.tsx";
import Button from "../../components/ui/button.tsx";

export default function LoginPage({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login-page">
      <span className="login-page__name">Вход</span>
      <div className="login-page__form">
        <Input label="Логин" placeholder="пример" value={login} onChange={setLogin} />
        <Input
          label="Пароль"
          placeholder="••••••••"
          isPassword={true}
          value={password}
          onChange={setPassword}
        />
        <Button full onClick={onLogin}>
          Войти
        </Button>
      </div>
    </div>
  );
}
