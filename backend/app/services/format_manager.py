import json
from pathlib import Path

from app.core.logger import get_logger
from app.core.paths import get_formats_dir
from app.schemas import CompanyFormat, CompanySummary

logger = get_logger()


class FormatManager:
    def __init__(self, formats_dir: str | Path | None = None):
        if formats_dir:
            self.formats_dir = Path(formats_dir)
        else:
            self.formats_dir = get_formats_dir()

        self._ensure_formats_dir()

    def _ensure_formats_dir(self) -> None:
        """フォーマット格納ディレクトリが存在しない場合は作成"""
        try:
            self.formats_dir.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            logger.error(f"Failed to create formats directory at {self.formats_dir}: {e}", exc_info=True)
            raise

    def _get_file_path(self, company_id: str) -> Path:
        """会社IDから安全なファイルパスを生成"""
        safe_id = Path(company_id).name
        return self.formats_dir / f"{safe_id}.json"

    def list_formats(self) -> list[CompanySummary]:
        """登録されている会社フォーマット一覧を取得"""
        summaries = []
        if not self.formats_dir.exists():
            return summaries

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
                logger.warning(f"Failed to read format file {file_path.name}: {e}")
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
            logger.error(f"Failed to load company format '{company_id}' from {file_path}: {e}", exc_info=True)
            return None

    def save_format(self, company_format: CompanyFormat) -> Path:
        """会社フォーマットをJSONファイルとして保存"""
        self._ensure_formats_dir()
        file_path = self._get_file_path(company_format.company_id)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(company_format.model_dump_json(indent=2))
            logger.info(f"Successfully saved company format: {company_format.company_id}")
            return file_path
        except OSError as e:
            logger.error(f"Failed to write company format file {file_path}: {e}", exc_info=True)
            raise

    def delete_format(self, company_id: str) -> bool:
        """会社フォーマットを削除"""
        file_path = self._get_file_path(company_id)
        if file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"Successfully deleted company format: {company_id}")
                return True
            except OSError as e:
                logger.error(f"Failed to delete company format file {file_path}: {e}", exc_info=True)
                raise
        return False

