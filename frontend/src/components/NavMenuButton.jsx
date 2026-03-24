import { Menu } from "lucide-react";
import useSidebar from "../hooks/useSidebar";

export default function NavMenuButton() {
  const { toggle } = useSidebar();
  return (
    <button className="nav__menu-btn" onClick={toggle}>
      <Menu />
    </button>
  );
}
