import {
  ANGLES,
  APP_CONSTANTS,
  INSPECTION_MODES,
  INSPECTION_STATUSES,
  TRAINING_STATUSES,
  USER_ROLES,
} from "@/constants";

export type Angle = (typeof ANGLES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type InspectionMode = (typeof INSPECTION_MODES)[number];
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];
export type Architecture = (typeof APP_CONSTANTS.training.architectures)[number]["value"];
