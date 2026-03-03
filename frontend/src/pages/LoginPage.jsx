import { useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/LoginPage.css";

export default function LoginPage({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login-page">
      <h1>Вход</h1>
      <div className="login-form">
        <Input label="Логин" placeholder="example_nf" value={login} onChange={setLogin} />
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
