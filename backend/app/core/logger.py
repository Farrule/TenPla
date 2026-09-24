import logging
import os
import sys
from datetime import datetime
from pathlib import Path

from app.core.paths import get_log_file_path

# モード判定フラグ (グローバル保持)
_current_app_mode: str = "web"
_backend_logger: logging.Logger | None = None


class BackendLogFormatter(logging.Formatter):
    """[backend] プレフィックスを先頭に付与するフォーマッター"""

    def __init__(self, prefix: str = "[backend]"):
        super().__init__(
            fmt=f"{prefix} %(asctime)s [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )


def is_tauri_mode() -> bool:
    """Windowsアプリ (Tauri) として実行されているかを判定"""
    if _current_app_mode == "tauri":
        return True
    if os.environ.get("TENPLA_APP_MODE") == "tauri":
        return True
    if getattr(sys, "frozen", False):
        return True
    return False


def setup_logging(app_mode: str | None = None) -> logging.Logger:
    """
    アプリケーションのログ設定を初期化する。
    - app_mode: 'tauri' または 'web'
    - Windowsアプリ (tauri): formats フォルダと同じ階層の logs.log に出力
    - Web版 (web): console (sys.stdout / sys.stderr) に出力
    """
    global _current_app_mode, _backend_logger
    if app_mode:
        _current_app_mode = app_mode

    logger = logging.getLogger("tenpla.backend")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    logger.propagate = False

    formatter = BackendLogFormatter("[backend]")

    if is_tauri_mode():
        # Windowsアプリ環境: formats フォルダと同階層の logs.log に追記
        log_file = get_log_file_path()
        try:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(str(log_file), mode="a", encoding="utf-8")
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except OSError as e:
            # 万が一ファイル作成・書き込みに失敗した場合はコンソールへフォールバック
            stream_handler = logging.StreamHandler(sys.stderr)
            stream_handler.setFormatter(formatter)
            logger.addHandler(stream_handler)
            logger.error(f"Failed to open log file at {log_file}: {e}")
    else:
        # Web版環境: console (標準エラー出力) へ出力
        stream_handler = logging.StreamHandler(sys.stderr)
        stream_handler.setLevel(logging.INFO)
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)

    _backend_logger = logger
    return logger


def get_logger() -> logging.Logger:
    """バックエンド用ロガーインスタンスを取得"""
    global _backend_logger
    if _backend_logger is None:
        _backend_logger = setup_logging()
    return _backend_logger


def write_log_entry(category: str, level: str, message: str) -> None:
    """
    カテゴリ ([frontend], [backend], [tauri]) を指定してログを出力する。
    Windowsアプリモードの場合は logs.log ファイルに書き込み、
    Web版モードの場合はコンソールに出力する。
    """
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_entry = f"[{category}] {now_str} [{level.upper()}] {message}\n"

    if is_tauri_mode():
        log_file = get_log_file_path()
        try:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(formatted_entry)
        except OSError as e:
            sys.stderr.write(f"[backend] {now_str} [ERROR] Failed to write to {log_file}: {e}\n")
            sys.stderr.write(formatted_entry)
    else:
        # Web版はコンソールに出力
        target_stream = sys.stderr if level.upper() in ("ERROR", "CRITICAL", "WARN", "WARNING") else sys.stdout
        target_stream.write(formatted_entry)
        target_stream.flush()
