import { Camera, FolderOpen, SearchCheck, Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import NavMenuButton from "../../components/ui/nav-menu-button";

export default function RootLayout() {
  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <NavMenuButton />
          <span className="nav__name">Photo Standards</span>
          <nav className="nav__links">
            <NavLink className="nav__link" to="/groups">
              <FolderOpen className="nav__link-icon" />
              Группы
            </NavLink>
            <NavLink className="nav__link" to="/training">
              <Camera className="nav__link-icon" />
              Обучение
            </NavLink>
            <NavLink className="nav__link" to="/inspections">
              <SearchCheck className="nav__link-icon" />
              Проверка
            </NavLink>
            <NavLink className="nav__link" to="/cameras">
              <Camera className="nav__link-icon" />
              Камеры
            </NavLink>
            <NavLink className="nav__link" to="/settings/users">
              <Settings className="nav__link-icon" />
              Настройки
            </NavLink>
          </nav>
        </div>
      </header>
      <div className="app-body">
        <Outlet />
      </div>
    </>
  );
}
