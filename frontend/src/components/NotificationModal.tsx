// frontend/src/components/NotificationModal.tsx
import React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type NotificationType = "success" | "error";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
}

interface NotificationModalProps {
  notifications: NotificationItem[];
  onClose: (id: string) => void;
}

/**
 * 画面右下に表示される共通結果通知モーダル
 * - 正常終了時: 背景色 青 (bg-blue-600)
 * - 異常時: 背景色 赤 (bg-red-600)
 */
export const NotificationModal: React.FC<NotificationModalProps> = ({
  notifications,
  onClose,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="通知エリア"
    >
      {notifications.map((item) => {
        const isSuccess = item.type === "success";
        // 正常終了時は青、異常時は赤
        const bgColorClass = isSuccess
          ? "bg-blue-600 border-blue-500 shadow-blue-500/20"
          : "bg-red-600 border-red-500 shadow-red-500/20";

        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl text-white shadow-2xl border ${bgColorClass} transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-5`}
            role="alert"
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-blue-100" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-100" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {item.title && (
                <h4 className="text-sm font-bold tracking-wide mb-0.5 leading-snug">
                  {item.title}
                </h4>
              )}
              <p className="text-xs text-white/95 leading-relaxed break-words font-medium">
                {item.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onClose(item.id)}
              className="flex-shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-black/10 transition-colors"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
