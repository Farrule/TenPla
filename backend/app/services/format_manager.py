import json
import os

from app.schemas import CompanyFormat, CompanySummary

# backend/formats を参照するようにパスを調整
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
FORMATS_DIR = os.path.join(BASE_DIR, "formats")


def list_formats() -> list[CompanySummary]:
    """登録されているフォーマットの一覧（IDと会社名）を返す"""
    os.makedirs(FORMATS_DIR, exist_ok=True)
    summaries: list[CompanySummary] = []

    for filename in os.listdir(FORMATS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(FORMATS_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    summaries.append(
                        CompanySummary(
                            company_id=data.get("company_id", ""),
                            company_name=data.get("company_name", filename),
                        )
                    )
            except Exception as e:
                print(f"Failed to read format file {filename}: {e}")

    sorted_summaries = sorted(summaries, key=lambda x: x.company_id)

    return sorted_summaries


def get_format(company_id: str) -> CompanyFormat | None:
    """指定されたIDの設定JSONを読み込み、Pydanticで検証して返す"""
    filepath = os.path.join(FORMATS_DIR, f"{company_id}.json")
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return CompanyFormat(**data)


def save_format(company_format: CompanyFormat) -> None:
    """フォーマット設定をJSONファイルとして保存する"""
    os.makedirs(FORMATS_DIR, exist_ok=True)
    filepath = os.path.join(FORMATS_DIR, f"{company_format.company_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(company_format.model_dump(), f, ensure_ascii=False, indent=2)
