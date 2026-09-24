import os
import sys
from pathlib import Path


def get_base_dir() -> Path:
    """
    アプリケーションの基準ディレクトリを取得する。
    - PyInstaller環境 (Tauri Sidecar): 実行可能ファイル (.exe) のあるディレクトリ
    - 開発環境: backend ディレクトリ
    """
    # 環境変数で明示的に指定されている場合はそれを優先
    env_base = os.environ.get("TENPLA_BASE_DIR")
    if env_base:
        return Path(env_base).resolve()

    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    else:
        # /workspace/backend/app/core/paths.py -> /workspace/backend
        return Path(__file__).resolve().parents[2]


def get_formats_dir() -> Path:
    """会社フォーマット設定 (JSON) を格納する formats ディレクトリのパスを取得"""
    return get_base_dir() / "formats"


def get_log_file_path() -> Path:
    """formats フォルダと同じ階層にある logs.log のパスを取得"""
    return get_base_dir() / "logs.log"
