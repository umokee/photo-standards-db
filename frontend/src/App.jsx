import { Camera, FolderOpen, Menu, SearchCheck, Settings } from "lucide-react";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { SidebarProvider } from "./context/SidebarProvider";
import CamerasPage from "./pages/cameras/CamerasPage";
import GroupsPage from "./pages/groups/GroupsPage";
import InspectionPage from "./pages/InspectionPage";
import ModelsPage from "./pages/models/ModelsPage";
import SegmentsPage from "./pages/segments/SegmentsPage";
import SettingsPage from "./pages/SettingsPage";
import NavMenuButton from "./components/NavMenuButton";

export default function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
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
          <Routes>
            <Route path="/groups/:groupId?" element={<GroupsPage />} />
            <Route path="/standards/:standardId/image/:imageId" element={<SegmentsPage />} />
            <Route path="/inspections" element={<InspectionPage />} />
            <Route path="/cameras/:cameraId?" element={<CamerasPage />} />
            <Route path="/settings/:tab" element={<SettingsPage />} />
            <Route path="/training/:groupId?" element={<ModelsPage />} />
            <Route path="/" element={<Navigate to="/groups" />} />
          </Routes>
        </div>
      </SidebarProvider>
    </BrowserRouter>
  );
}
