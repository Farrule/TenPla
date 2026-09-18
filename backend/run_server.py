# backend/run_server.py
import os
import sys

import uvicorn

# PyInstallerで固めた際のカレントパス調整
if getattr(sys, "frozen", False):
    os.chdir(sys._MEIPASS)

from main import app

if __name__ == "__main__":
    # ポート8000でFastAPIを起動
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
