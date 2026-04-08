import { NavigationBar } from "@/components/layouts/navigation-bar/navigation-bar";
import { Brain, Camera, FolderOpen } from "lucide-react";
import { Outlet } from "react-router-dom";
import { paths } from "../paths";

export default function RootLayout() {
  return (
    <>
      <NavigationBar>
        <NavigationBar.Link to={paths.groups()} icon={FolderOpen}>
          Группы
        </NavigationBar.Link>
        <NavigationBar.Link to={paths.training()} icon={Brain}>
          Обучение
        </NavigationBar.Link>
        <NavigationBar.Link to={paths.cameras()} icon={Camera}>
          Камеры
        </NavigationBar.Link>
      </NavigationBar>
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <Outlet />
      </div>
    </>
  );
}
