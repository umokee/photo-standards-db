import { FolderOpen } from "lucide-react";
import { NavLink } from "react-router-dom";
import "../styles/Header.css";

export default function Header({ initials }) {
  return (
    <header className="header">
      <div className="header-inner">
        <span className="header-title">Photo Standards</span>
        <nav className="header-link-container">
          <NavLink className="header-link" to="/groups">
            <FolderOpen className="header-link-icon" />
            Группы
          </NavLink>
          <NavLink className="header-link" to="/cameras">
            <FolderOpen className="header-link-icon" />
            Камеры
          </NavLink>
        </nav>
        <div className="header-avatar">
          <span className="header-avatar-label">{initials}</span>
        </div>
      </div>
    </header>
  );
}
