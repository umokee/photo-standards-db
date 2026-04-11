import type {
  Angle,
  Architecture,
  InspectionMode,
  InspectionStatus,
  TrainingStatus,
  UserRole,
} from "@/types/contracts";
import { ru } from "@/utils/ru";

export const roleLabel = (role: UserRole) => ru.users.roles[role];

export const angleLabel = (angle: Angle) => ru.standards.angles[angle];

export const inspectionModeLabel = (mode: InspectionMode) => ru.inspections.modes[mode];

export const inspectionStatusLabel = (status: InspectionStatus) => ru.inspections.statuses[status];

export const trainingStatusLabel = (status: TrainingStatus) => ru.training.statuses[status];

export const architectureLabel = (architecture: Architecture) =>
  ru.training.architectures[architecture];
