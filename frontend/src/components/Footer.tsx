import { useState, useEffect } from "react";

export function Footer() {
  const [version, setVersion] = useState<string>("X.X.X");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const win = window as any;
        if (win.__TAURI__?.core?.invoke) {
          const ver = await win.__TAURI__.core.invoke("get_app_version");
          if (ver) {
            setVersion(ver);
            return;
          }
        }
        if (win.__TAURI_INTERNALS__?.invoke) {
          const ver = await win.__TAURI_INTERNALS__.invoke("get_app_version");
          if (ver) {
            setVersion(ver);
            return;
          }
        }
      } catch {
        // Tauri環境外やエラー時は初期値(1.2.5)を維持
      }
    };

    fetchVersion();
  }, []);

  return (
    <footer className="mt-auto py-3 text-center text-xs font-medium text-slate-500 border-t border-slate-200 bg-white shadow-sm">
      TenPla v{version}
    </footer>
  );
}
