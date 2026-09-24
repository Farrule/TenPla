// frontend/src/context/NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
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

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (type: NotificationType, message: string, title?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newItem: NotificationItem = {
        id,
        type,
        title: title || (type === "success" ? "完了" : "エラー"),
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
