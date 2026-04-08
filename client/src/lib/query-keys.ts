export const queryKeys = {
  groups: {
    all: () => ["groups"] as const,
    detail: (groupId: string) => ["groups", groupId] as const,
  },

  standards: {
    detail: (standardId: string) => ["standards", standardId] as const,
    image: (imageId: string) => ["standards", "images", imageId] as const,
  },

  segments: {
    all: () => ["segments"] as const,
  },

  training: {
    models: (groupId: string) => ["training", groupId, "models"] as const,
    tasks: (groupId: string) => ["training", groupId, "tasks"] as const,
    task: (taskId: string) => ["training", "tasks", taskId] as const,
  },

  cameras: {
    all: () => ["cameras"] as const,
    detail: (cameraId: string) => ["cameras", cameraId] as const,
  },
} as const;
