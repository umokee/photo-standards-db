import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "./routes/root";

const GroupsRoute = () => import("./routes/groups");
const ImagesRoute = () => import("./routes/images");
const ModelsRoute = () => import("./routes/training");
const CamerasRoute = () => import("./routes/cameras");

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Navigate to="/groups" /> },
      { path: "/groups/:groupId?", lazy: GroupsRoute },
      { path: "/groups/:groupId/standards/:standardId?", lazy: GroupsRoute },
      { path: "/groups/:groupId/standards/:standardId/images/:imageId", lazy: ImagesRoute },
      { path: "/training/:groupId?", lazy: ModelsRoute },
      { path: "/training/:groupId/models/:modelId", lazy: ModelsRoute },
      { path: "/cameras/:cameraId?", lazy: CamerasRoute },
    ],
  },
]);
