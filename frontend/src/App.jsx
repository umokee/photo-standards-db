import { Camera, FolderOpen, SearchCheck, Settings } from "lucide-react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import CamerasPage from "./pages/CamerasPage";
import GroupsPage from "./pages/GroupsPage";
import InspectionPage from "./pages/InspectionPage";
import SettingsPage from "./pages/SettingsPage";
import StandardDetailPage from "./pages/StandardDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <header className="nav">
        <div className="nav__inner">
          <span className="nav__name">Photo Standards</span>
          <nav className="nav__links">
            <NavLink className="nav__link" to="/groups">
              <FolderOpen className="nav__link-icon" />
              Группы
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
          <div className="nav__avatar">
            <span className="nav__avatar-label">INIT</span>
          </div>
        </div>
      </header>
      <Routes>
        <Route path="/groups/:id?" element={<GroupsPage />} />
        <Route path="/standards/:id" element={<StandardDetailPage />} />
        <Route path="/inspections" element={<InspectionPage />} />
        <Route path="/cameras/:id?" element={<CamerasPage />} />
        <Route path="/settings/:tab" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
