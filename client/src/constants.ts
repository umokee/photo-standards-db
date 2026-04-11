import { angleLabel, architectureLabel, inspectionModeLabel, roleLabel } from "@/utils/labels";
import raw from "../../constants.json";

export const APP_CONSTANTS = raw;

export const USER_ROLES = raw.users.roles;
export const ANGLES = raw.standards.angles;
export const INSPECTION_MODES = raw.inspections.modes;
export const INSPECTION_STATUSES = raw.inspections.statuses;

export const TRAINING_STATUSES = raw.training.statuses;
export const ACTIVE_TRAINING_STATUSES = raw.training.activeStatuses;
export const TRAINING_LIMITS = raw.training.limits;
export const TRAINING_DEFAULTS = raw.training.defaults;
export const TRAINING_IMAGE_SIZES = raw.training.imageSizes;
export const TRAINING_ARCHITECTURES = raw.training.architectures.map((item) => item.value);

export const ROLE_OPTIONS = USER_ROLES.map((value) => ({
  value,
  label: roleLabel(value),
}));

export const ANGLE_OPTIONS = ANGLES.map((value) => ({
  value,
  label: angleLabel(value),
}));

export const INSPECTION_MODE_OPTIONS = INSPECTION_MODES.map((value) => ({
  value,
  label: inspectionModeLabel(value),
}));

export const ARCHITECTURE_OPTIONS = TRAINING_ARCHITECTURES.map((value) => ({
  value,
  label: architectureLabel(value),
}));

export const IMAGE_SIZE_OPTIONS = TRAINING_IMAGE_SIZES.map((value) => ({
  value: String(value),
  label: String(value),
}));
