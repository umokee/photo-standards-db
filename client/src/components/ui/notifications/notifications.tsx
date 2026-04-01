import { createPortal } from "react-dom";
import { Notification } from "./notification";
import s from "./notification.module.scss";
import { useNotificationStore } from "./notifications-store";

export function Notifications() {
  const notifications = useNotificationStore((s) => s.notifications);

  return createPortal(
    <div className={s.container}>
      {notifications.map((n) => (
        <Notification key={n.id} notification={n} />
      ))}
    </div>,
    document.body
  );
}
