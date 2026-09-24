# backend/run_server.py
import argparse
import os
import sys

import uvicorn

# PyInstallerで固めた際のカレントパス調整
if getattr(sys, "frozen", False):
    os.chdir(sys._MEIPASS)

from app.main import app

if __name__ == "__main__":
    # 引数からポート番号を受け取れるようにする（アプリ起動時はデフォルト: 8000）
    parser = argparse.ArgumentParser(description="TenPla Backend Server")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", 8000)),
        help="Port to run the server on",
    )
    args = parser.parse_args()

    print(f"[TenPla] Starting backend server on 127.0.0.1:{args.port}")
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
