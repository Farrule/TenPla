import json
import sys
from pathlib import Path

from app.schemas import CompanyFormat, CompanySummary


class FormatManager:
    def __init__(self, formats_dir: str | None = None):
        if formats_dir:
            self.formats_dir = Path(formats_dir)
        else:
            if getattr(sys, "frozen", False):
                # PyInstaller環境 (Tauri Sidecar: <インストール先>/binaries/backend-server.exe)
                # sys.executable の親の親を指すことで、インストールフォルダを基準にする
                base_dir = Path(sys.executable).resolve().parent
            else:
                # 開発環境: /workspace/backend/app/services/format_manager.py -> /workspace/backend
                base_dir = Path(__file__).resolve().parents[2]

            self.formats_dir = base_dir / "formats"

        self._ensure_formats_dir()

    def _ensure_formats_dir(self) -> None:
        """フォーマット格納ディレクトリが存在しない場合は作成"""
        self.formats_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, company_id: str) -> Path:
        """会社IDから安全なファイルパスを生成"""
        safe_id = Path(company_id).name
        return self.formats_dir / f"{safe_id}.json"

    def list_formats(self) -> list[CompanySummary]:
        """登録されている会社フォーマット一覧を取得"""
        summaries = []
        for file_path in self.formats_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    summaries.append(
                        CompanySummary(
                            company_id=data.get("company_id", file_path.stem),
                            company_name=data.get("company_name", "未設定"),
                        )
                    )
            except (json.JSONDecodeError, OSError) as e:
                print(f"[Warning] Failed to read format file {file_path}: {e}")
                continue
        return summaries

    def get_format(self, company_id: str) -> CompanyFormat | None:
        """指定されたIDのフォーマット設定を取得"""
        file_path = self._get_file_path(company_id)
        if not file_path.exists():
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return CompanyFormat(**data)
        except (json.JSONDecodeError, OSError) as e:
            print(f"[Error] Failed to load company format '{company_id}': {e}")
            return None

    def save_format(self, company_format: CompanyFormat) -> Path:
        """会社フォーマットをJSONファイルとして保存"""
        file_path = self._get_file_path(company_format.company_id)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(company_format.model_dump_json(indent=2))
        return file_path

    def delete_format(self, company_id: str) -> bool:
        """会社フォーマットを削除"""
        file_path = self._get_file_path(company_id)
        if file_path.exists():
            file_path.unlink()
            return True
        return False
