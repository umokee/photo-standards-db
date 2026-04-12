import { queryClient } from "@/lib/query-client";
import { getGroupQueryOptions } from "@/page-components/groups/api/get-group";
import { getGroupsQueryOptions } from "@/page-components/groups/api/get-groups";
import { getMlsQueryOptions } from "@/page-components/mls/api/get-mls";
import { getImageQueryOptions } from "@/page-components/standards/api/get-image";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
import { createBrowserRouter, Navigate, redirect } from "react-router-dom";
import { paths } from "./paths";
import { routePaths } from "./route-paths";
import RootLayout from "./routes/root";
import RouteError from "./routes/route-error";
import RouteLoadingFallback from "./routes/route-loading-fallback";

const GroupsLayoutRoute = () => import("./routes/groups/groups-layout");
const GroupsIndexRoute = () => import("./routes/groups/groups-index");
const GroupDetailRoute = () => import("./routes/groups/group-detail");
const StandardDetailRoute = () => import("./routes/groups/standard-detail");

const ImagesRoute = () => import("./routes/images/images");

const TrainingLayoutRoute = () => import("./routes/training/training-layout");
const TrainingIndexRoute = () => import("./routes/training/training-index");
const TrainingDetailRoute = () => import("./routes/training/training-detail");
const MlDetailRoute = () => import("./routes/training/model-detail");

const CamerasRoute = () => import("./routes/cameras");

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoadingFallback />,
    children: [
      {
        path: paths.home(),
        element: <Navigate to={paths.groups()} replace />,
      },
      {
        path: paths.groups(),
        lazy: GroupsLayoutRoute,
        errorElement: <RouteError />,
        hydrateFallbackElement: <RouteLoadingFallback />,
        loader: async () => {
          await queryClient.ensureQueryData(getGroupsQueryOptions());
        },
        children: [
          {
            index: true,
            lazy: GroupsIndexRoute,
          },
          {
            path: ":groupId",
            lazy: GroupDetailRoute,
            loader: async ({ params }) => {
              const groupId = params.groupId?.trim();

              if (!groupId) {
                throw redirect(paths.groups());
              }

              await queryClient.ensureQueryData(getGroupQueryOptions(groupId));

              return { groupId };
            },
            children: [
              {
                index: true,
                lazy: StandardDetailRoute,
                loader: async () => {
                  return { standardId: null };
                },
              },
              {
                path: "standards/:standardId",
                lazy: StandardDetailRoute,
                loader: async ({ params }) => {
                  const groupId = params.groupId?.trim();
                  const standardId = params.standardId?.trim();

                  if (!groupId) {
                    throw redirect(paths.groups());
                  }

                  if (!standardId) {
                    throw redirect(paths.groupDetail(groupId));
                  }

                  await Promise.all([
                    queryClient.ensureQueryData(getGroupQueryOptions(groupId)),
                    queryClient.ensureQueryData(getStandardQueryOptions(standardId)),
                  ]);

                  return { standardId };
                },
              },
            ],
          },
        ],
      },
      {
        path: "/groups/:groupId/standards/:standardId/images/:imageId",
        lazy: ImagesRoute,
        errorElement: <RouteError />,
        hydrateFallbackElement: <RouteLoadingFallback />,
        loader: async ({ params }) => {
          const groupId = params.groupId?.trim();
          const standardId = params.standardId?.trim();
          const imageId = params.imageId?.trim();

          if (!groupId) {
            throw redirect(paths.groups());
          }

          if (!standardId) {
            throw redirect(paths.groupDetail(groupId));
          }

          if (!imageId) {
            throw redirect(paths.standardDetail(groupId, standardId));
          }

          await Promise.all([
            queryClient.ensureQueryData(getGroupQueryOptions(groupId)),
            queryClient.ensureQueryData(getStandardQueryOptions(standardId)),
            queryClient.ensureQueryData(getImageQueryOptions(imageId)),
          ]);

          return { groupId, standardId, imageId };
        },
      },
      {
        path: paths.training(),
        lazy: TrainingLayoutRoute,
        errorElement: <RouteError />,
        hydrateFallbackElement: <RouteLoadingFallback />,
        loader: async () => {
          await queryClient.ensureQueryData(getGroupsQueryOptions());
        },
        children: [
          {
            index: true,
            lazy: TrainingIndexRoute,
          },
          {
            path: ":groupId",
            lazy: TrainingDetailRoute,
            loader: async ({ params }) => {
              const groupId = params.groupId?.trim();

              if (!groupId) {
                throw redirect(paths.training());
              }

              await queryClient.ensureQueryData(getMlsQueryOptions(groupId));

              return { groupId };
            },
            children: [
              {
                index: true,
                lazy: MlDetailRoute,
                loader: async () => {
                  return { mlId: null };
                },
              },
              {
                path: "mls/:mlId",
                lazy: MlDetailRoute,
                loader: async ({ params }) => {
                  const groupId = params.groupId?.trim();
                  const modelId = params.mlId?.trim();

                  if (!groupId) {
                    throw redirect(paths.training());
                  }

                  if (!modelId) {
                    throw redirect(paths.trainingGroup(groupId));
                  }

                  await Promise.all([
                    queryClient.ensureQueryData(getMlsQueryOptions(groupId)),
                    // queryClient.ensureQueryData(getStandardQueryOptions(standardId)),
                  ]);

                  return { modelId };
                },
              },
            ],
          },
        ],
      },

      { path: routePaths.cameras, lazy: CamerasRoute },
      { path: routePaths.camera, lazy: CamerasRoute },
    ],
  },
]);
