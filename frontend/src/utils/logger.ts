// frontend/src/utils/logger.ts

export type LogCategory = "frontend" | "backend" | "tauri";
export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

/**
 * Tauri (Windowsデスクトップ) 環境で動作しているかを判定
 */
export const isTauri = (): boolean => {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  );
};

/**
 * エラーオブジェクトを詳細な文字列に変換
 */
const formatErrorDetails = (error: unknown): string => {
  if (!error) return "";
  if (error instanceof Error) {
    return error.stack ? `\n${error.stack}` : ` (${error.message})`;
  }
  if (typeof error === "object") {
    try {
      return ` (${JSON.stringify(error)})`;
    } catch {
      return ` (${String(error)})`;
    }
  }
  return ` (${String(error)})`;
};

/**
 * Tauriのinvoke関数を実行してRust側にログ書き込みを要求
 */
const invokeTauriLog = async (
  category: LogCategory,
  level: LogLevel,
  message: string,
): Promise<boolean> => {
  try {
    const win = window as any;
    if (win.__TAURI__?.core?.invoke) {
      await win.__TAURI__.core.invoke("log_message", {
        category,
        level,
        message,
      });
      return true;
    }
    if (win.__TAURI_INTERNALS__?.invoke) {
      await win.__TAURI_INTERNALS__.invoke("log_message", {
        category,
        level,
        message,
      });
      return true;
    }
  } catch (err) {
    console.error("[tauri] Failed to invoke log_message command:", err);
  }
  return false;
};

/**
 * バックエンドの /api/logs エンドポイントへログを送信（フォールバック用）
 */
const sendLogToBackend = async (
  category: LogCategory,
  level: LogLevel,
  message: string,
): Promise<void> => {
  try {
    const baseUrl = isTauri()
      ? import.meta.env.VITE_API_TAURI_URL || "http://127.0.0.1:8000"
      : import.meta.env.VITE_API_WEB_URL || "http://127.0.0.1:8001";

    await fetch(`${baseUrl}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, level, message }),
    });
  } catch {
    // ログ送信自体の失敗は無視（ループ防止）
  }
};

/**
 * ログ共通出力関数
 * - Web版: consoleに出力 (例: [frontend] ...)
 * - Windowsアプリ (Tauri): formatsフォルダと同階層の logs.log に追記 (Tauri経由) + console出力
 */
export const writeLog = (
  category: LogCategory,
  level: LogLevel,
  message: string,
  error?: unknown,
): void => {
  const errorDetails = formatErrorDetails(error);
  const fullMessage = `${message}${errorDetails}`;
  const prefix = `[${category}]`;

  // 1. Web版およびデバッグ用コンソール出力
  if (level === "ERROR") {
    console.error(`${prefix} ${message}`, error ?? "");
  } else if (level === "WARN") {
    console.warn(`${prefix} ${message}`, error ?? "");
  } else {
    console.info(`${prefix} ${message}`);
  }

  // 2. Windowsアプリ (Tauri) 環境時は logs.log に書き込む
  if (isTauri()) {
    invokeTauriLog(category, level, fullMessage).then((success) => {
      if (!success) {
        // Tauri invokeが使えなかった場合はバックエンド経由で logs.log に書き込み
        sendLogToBackend(category, level, fullMessage);
      }
    });
  }
};

export const logger = {
  error: (category: LogCategory, message: string, error?: unknown) =>
    writeLog(category, "ERROR", message, error),
  warn: (category: LogCategory, message: string, error?: unknown) =>
    writeLog(category, "WARN", message, error),
  info: (category: LogCategory, message: string) =>
    writeLog(category, "INFO", message),
  debug: (category: LogCategory, message: string) =>
    writeLog(category, "DEBUG", message),
};
