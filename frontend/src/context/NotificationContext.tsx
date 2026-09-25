// frontend/src/context/NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { NotificationItem, NotificationModal, NotificationType } from "../components/NotificationModal";

interface NotificationContextType {
  notify: (type: NotificationType, message: string, title?: string, duration?: number) => void;
  notifySuccess: (message: string, title?: string, duration?: number) => void;
  notifyError: (message: string, title?: string, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // 短時間の同一通知重複防止用
  const lastNotificationRef = useRef<{ key: string; timestamp: number }>({
    key: "",
    timestamp: 0,
  });

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (type: NotificationType, message: string, title?: string, duration = 4000) => {
      const resolvedTitle = title || (type === "success" ? "完了" : "エラー");
      const key = `${type}:${resolvedTitle}:${message}`;
      const now = Date.now();

      // 同一内容の通知が短時間（500ms以内）に連続して発行された場合は重複として無視
      if (
        lastNotificationRef.current.key === key &&
        now - lastNotificationRef.current.timestamp < 500
      ) {
        return;
      }
      lastNotificationRef.current = { key, timestamp: now };

      const id = `${now}-${Math.random().toString(36).substring(2, 9)}`;
      const newItem: NotificationItem = {
        id,
        type,
        title: resolvedTitle,
        message,
      };

      setNotifications((prev) => [...prev, newItem]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const notifySuccess = useCallback(
    (message: string, title?: string, duration?: number) => {
      notify("success", message, title ?? "成功", duration);
    },
    [notify]
  );

  const notifyError = useCallback(
    (message: string, title?: string, duration?: number) => {
      notify("error", message, title ?? "エラー", duration);
    },
    [notify]
  );

  return (
    <NotificationContext.Provider
      value={{
        notify,
        notifySuccess,
        notifyError,
        removeNotification,
      }}
    >
      {children}
      <NotificationModal
        notifications={notifications}
        onClose={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};
