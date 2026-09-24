import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./utils/logger";
import "./index.css";

// 未処理のJavaScript例外ハンドラー
window.addEventListener("error", (event) => {
  logger.error(
    "frontend",
    `未処理のエラー: ${event.message} (${event.filename}:${event.lineno}:${event.colno})`,
    event.error,
  );
});

// 未処理のPromise Rejectionハンドラー
window.addEventListener("unhandledrejection", (event) => {
  logger.error(
    "frontend",
    `未処理のPromise拒否: ${event.reason?.message || event.reason}`,
    event.reason,
  );
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

