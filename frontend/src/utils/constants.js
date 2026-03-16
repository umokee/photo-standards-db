export const BASE_URL = "http://localhost:3001";

export const SETTINGS_TABS = [
  { value: "users", label: "Пользователи" },
  { value: "system", label: "Систeма" },
];

export const ROLES = [
  { value: "operator", label: "Оператор" },
  { value: "inspector", label: "Инспектор" },
  { value: "admin", label: "Администратор" },
];

export const ANGLES = [
  {
    value: "front",
    label: "Спереди",
  },
  {
    value: "left",
    label: "Слева",
  },
  {
    value: "right",
    label: "Справа",
  },
  {
    value: "top",
    label: "Сверху",
  },
  {
    value: "back",
    label: "Сзади",
  },
];

export const INSPECTION_MODES = [
  {
    name: "Загрузка фото",
    value: "photo",
  },
  {
    name: "Снимок с камеры",
    value: "snapshot",
  },
  {
    name: "Live-режим",
    value: "realtime",
  },
];
