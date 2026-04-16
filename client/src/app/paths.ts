export const paths = {
  home: () => "/",

  groups: () => "/groups",
  groupDetail: (groupId: string) => `/groups/${groupId}`,
  standardDetail: (groupId: string, standardId: string) => {
    return `/groups/${groupId}/standards/${standardId}`;
  },
  standardImage: (groupId: string, standardId: string, imageId: string) => {
    return `/groups/${groupId}/standards/${standardId}/images/${imageId}`;
  },

  training: () => "/training",
  trainingGroup: (groupId: string) => `/training/${groupId}`,
  trainingModel: (groupId: string, modelId: string) => `/training/${groupId}/models/${modelId}`,

  inspection: () => "/inspection",
  inspectionMode: (mode: string) => `/inspection/${mode}`,
  inspectionGroup: (mode: string, groupId: string) => {
    return `/inspection/${mode}/groups/${groupId}`;
  },
  inspectionStandard: (mode: string, groupId: string, standardId: string) => {
    return `/inspection/${mode}/groups/${groupId}/standards/${standardId}`;
  },

  cameras: () => "/cameras",
  cameraDetail: (cameraId: string) => `/cameras/${cameraId}`,
} as const;
