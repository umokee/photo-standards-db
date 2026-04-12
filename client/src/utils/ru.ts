export const ru = {
  users: {
    roles: {
      operator: "Оператор",
      inspector: "Инспектор",
      admin: "Администратор",
    },
  },
  standards: {
    angles: {
      front: "Спереди",
      top: "Сверху",
      left: "Слева",
      right: "Справа",
      back: "Сзади",
    },
  },
  inspections: {
    modes: {
      photo: "Загрузка фото",
      snapshot: "Снимок с камеры",
      realtime: "Live-режим",
    },
    statuses: {
      passed: "Пройдено",
      failed: "Не пройдено",
    },
  },
  training: {
    statuses: {
      pending: "В очереди",
      preparing: "Подготовка",
      training: "Обучение",
      saving: "Сохранение",
      done: "Готово",
      failed: "Ошибка",
    },
    architectures: {
      "yolov26n-seg": "YOLO v26 Nano",
    },
    metrics: {
      mAP50: "mAP50",
      mAP50_95: "mAP50-95",
      precision: "Precision",
      recall: "Recall",
    },
  },
};
