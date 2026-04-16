import { queryClient } from "@/lib/query-client";
import { getGroupQueryOptions } from "@/page-components/groups/api/get-group";
import { getGroupsQueryOptions } from "@/page-components/groups/api/get-groups";
import { getConstantsQueryOptions } from "@/page-components/meta/get-constants";
import { getModelQueryOptions } from "@/page-components/models/api/get-ml";
import { getModelsQueryOptions } from "@/page-components/models/api/get-models";
import { getImageQueryOptions } from "@/page-components/standards/api/get-image";
import { getStandardQueryOptions } from "@/page-components/standards/api/get-standard";
import { getTasksQueryOptions } from "@/page-components/tasks/api/get-tasks";
import { createBrowserRouter, Navigate, redirect } from "react-router-dom";
import { paths } from "./paths";
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
const ModelDetailRoute = () => import("./routes/training/model-detail");

const InspectionLayoutRoute = () => import("./routes/inspection/inspection-layout");
const InspectionIndexRoute = () => import("./routes/inspection/inspection-index");
const InspectionGroupRoute = () => import("./routes/inspection/inspection-group");
const InspectionStandardRoute = () => import("./routes/inspection/inspection-standard");

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoadingFallback />,
    loader: async () => {
      await queryClient.ensureQueryData(getConstantsQueryOptions());
    },
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

              await Promise.all([
                queryClient.ensureQueryData(getModelsQueryOptions(groupId)),
                queryClient.ensureQueryData(getTasksQueryOptions(groupId)),
              ]);

              return { groupId };
            },
            children: [
              {
                index: true,
                lazy: ModelDetailRoute,
                loader: async () => {
                  return { modelId: null };
                },
              },
              {
                path: "models/:modelId",
                lazy: ModelDetailRoute,
                loader: async ({ params }) => {
                  const groupId = params.groupId?.trim();
                  const modelId = params.modelId?.trim();

                  if (!groupId) {
                    throw redirect(paths.training());
                  }

                  if (!modelId) {
                    throw redirect(paths.trainingGroup(groupId));
                  }

                  await queryClient.ensureQueryData(getModelQueryOptions(modelId));

                  return { modelId };
                },
              },
            ],
          },
        ],
      },
      {
        path: paths.inspection(),
        loader: async () => {
          throw redirect(paths.inspectionMode("photo"));
        },
      },
      {
        path: "/inspection/:mode",
        lazy: InspectionLayoutRoute,
        errorElement: <RouteError />,
        hydrateFallbackElement: <RouteLoadingFallback />,
        loader: async () => {
          await queryClient.ensureQueryData(getGroupsQueryOptions());
        },
        children: [
          {
            index: true,
            lazy: InspectionIndexRoute,
          },
          {
            path: "groups/:groupId",
            lazy: InspectionGroupRoute,
            loader: async ({ params }) => {
              const mode = params.mode?.trim();
              const groupId = params.groupId?.trim();

              if (!mode) {
                throw redirect(paths.inspection());
              }

              if (!groupId) {
                throw redirect(paths.inspectionMode(mode));
              }

              await queryClient.ensureQueryData(getGroupQueryOptions(groupId));

              return { groupId };
            },
          },
          {
            path: "groups/:groupId/standards/:standardId",
            lazy: InspectionStandardRoute,
            loader: async ({ params }) => {
              const mode = params.mode?.trim();
              const groupId = params.groupId?.trim();
              const standardId = params.standardId?.trim();

              if (!mode) {
                throw redirect(paths.inspection());
              }

              if (!groupId) {
                throw redirect(paths.inspectionMode(mode));
              }

              if (!standardId) {
                throw redirect(paths.inspectionGroup(mode, groupId));
              }

              await Promise.all([
                queryClient.ensureQueryData(getGroupQueryOptions(groupId)),
                queryClient.ensureQueryData(getStandardQueryOptions(standardId)),
              ]);

              return { groupId, standardId };
            },
          },
        ],
      },
    ],
  },
]);
