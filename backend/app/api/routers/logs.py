from typing import Literal

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.core.logger import write_log_entry

router = APIRouter(prefix="/api/logs", tags=["logs"])


class LogEntryRequest(BaseModel):
    category: Literal["frontend", "backend", "tauri"] = Field(..., description="ログの発生元カテゴリ")
    level: Literal["INFO", "WARN", "WARNING", "ERROR", "DEBUG"] = Field("INFO", description="ログレベル")
    message: str = Field(..., description="ログ本文")


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
def receive_log(entry: LogEntryRequest):
    """
    Frontend等からログを受け取り、動作環境に応じた出力先
    （Windowsアプリなら logs.log、Web版なら console）へ書き込む。
    """
    write_log_entry(entry.category, entry.level, entry.message)
    return None
