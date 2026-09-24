from typing import Any, Literal

from pydantic import BaseModel, Field


class ExtractionRule(BaseModel):
    field_name: str = Field(..., description="項目名（例: 請求日, 合計金額）")
    excel_cell: str | None = Field(None, description="転記先Excelセル（例: B2）")
    excel_start_cell: str | None = Field(
        None, description="テーブル用Excel開始セル（例: A10）"
    )
    method: Literal["keyword_after", "regex", "table"] = Field(
        ..., description="抽出方法"
    )
    keyword: str | None = Field(None, description="keyword_after用: 検索対象の文字")
    pattern: str | None = Field(None, description="regex用: 正規表現パターン")
    table_index: int | None = Field(0, description="table用: PDF内の何番目の表か")


class CompanyFormat(BaseModel):
    company_id: str = Field(..., description="会社識別子（英数字・ファイル名）")
    company_name: str = Field(..., description="会社名（表示用）")
    rules: list[ExtractionRule] = Field(default_factory=list)


class CompanySummary(BaseModel):
    company_id: str
    company_name: str


class ExtractedFieldResult(BaseModel):
    field_name: str
    excel_cell: str | None = None
    excel_start_cell: str | None = None
    method: str
    value: Any = None  # 文字列またはテーブルの行リスト


class ExtractionResponse(BaseModel):
    company_id: str
    company_name: str
    extracted_data: list[ExtractedFieldResult]
    pdf_filename: str | None = None
