export type Angle = "front" | "top" | "left" | "right" | "back";
export type UserRole = "operator" | "inspector" | "admin";
export type InspectionStatus = "passed" | "failed";
export type InspectionMode = "photo" | "snapshot" | "realtime";
export type Architecture =
  | "yolov26n-seg"
  | "yolov26s-seg"
  | "yolov26m-seg"
  | "yolov26l-seg"
  | "yolov26x-seg";

export type TrainingStatus = "pending" | "preparing" | "training" | "saving" | "done" | "failed";
