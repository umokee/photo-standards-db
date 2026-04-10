import { createBrowserRouter, Navigate, redirect } from "react-router-dom";
import { paths } from "./paths";
import { routePaths } from "./route-paths";
import RootLayout from "./routes/root";
import RouteError from "./routes/route-error";

const GroupsLayoutRoute = () => import("./routes/groups/groups-layout");
const GroupsIndexRoute = () => import("./routes/groups/groups-index");
const GroupDetailRoute = () => import("./routes/groups/group-detail");
const StandardsIndexRoute = () => import("./routes/groups/standards-index");
const StandardDetailRoute = () => import("./routes/groups/standard-detail");
const ImagesRoute = () => import("./routes/images");

const TrainingRoute = () => import("./routes/training");
const CamerasRoute = () => import("./routes/cameras");

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: paths.home(),
        element: <Navigate to={routePaths.groups} replace />,
      },
      {
        path: routePaths.groups,
        lazy: GroupsLayoutRoute,
        errorElement: <RouteError />,
        children: [
          {
            index: true,
            lazy: GroupsIndexRoute,
          },
          {
            path: ":groupId",
            lazy: GroupDetailRoute,
            errorElement: <RouteError />,
            loader: async ({ params }) => {
              const groupId = params.groupId?.trim();

              if (!groupId) {
                throw redirect(paths.groups());
              }

              return { groupId };
            },
            children: [
              {
                path: "standards",
                children: [
                  {
                    index: true,
                    lazy: StandardsIndexRoute,
                  },
                  {
                    path: ":standardId",
                    lazy: StandardDetailRoute,
                    loader: async ({ params }) => {
                      const groupId = params.groupId?.trim();
                      const standardId = params.standardId?.trim();

                      if (!standardId) {
                        throw redirect(paths.groupDetail(groupId));
                      }

                      return { standardId };
                    },
                  },
                ],
              },
              {
                path: "standards/:standardId/images/:imageId",
                lazy: ImagesRoute,
              },
            ],
          },
        ],
      },

      { path: routePaths.training, lazy: TrainingRoute },
      { path: routePaths.trainingGroup, lazy: TrainingRoute },
      { path: routePaths.trainingModel, lazy: TrainingRoute },

      { path: routePaths.cameras, lazy: CamerasRoute },
      { path: routePaths.camera, lazy: CamerasRoute },
    ],
  },
]);
