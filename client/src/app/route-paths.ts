export const routePaths = {
  home: "/",
  groups: "/groups",
  group: "/groups/:groupId",
  standard: "/groups/:groupId/standards/:standardId",
  standardImage: "/groups/:groupId/standards/:standardId/images/:imageId",
  training: "/training",
  trainingGroup: "/training/:groupId",
  trainingModel: "/training/:groupId/models/:modelId",
  cameras: "/cameras",
  camera: "/cameras/:cameraId",
} as const;
