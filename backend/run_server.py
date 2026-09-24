# backend/run_server.py
import argparse
import os
import sys

import uvicorn

# PyInstaller の --windowed 実行時に stdout/stderr が None になりクラッシュするのを防止
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

# PyInstallerで固めた際のカレントパス調整
if getattr(sys, "frozen", False):
    os.chdir(sys._MEIPASS)

from app.core.logger import get_logger, setup_logging
from app.main import app

if __name__ == "__main__":
    # 引数からポート番号や動作モードを受け取れるようにする
    parser = argparse.ArgumentParser(description="TenPla Backend Server")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", 8000)),
        help="Port to run the server on",
    )
    parser.add_argument(
        "--app-mode",
        type=str,
        choices=["tauri", "web"],
        default=os.environ.get("TENPLA_APP_MODE", "tauri" if getattr(sys, "frozen", False) else "web"),
        help="Execution mode (tauri or web)",
    )
    args = parser.parse_args()

    setup_logging(args.app_mode)
    logger = get_logger()
    logger.info(f"Starting backend server on 127.0.0.1:{args.port} (mode: {args.app_mode})")

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning", log_config=None)

