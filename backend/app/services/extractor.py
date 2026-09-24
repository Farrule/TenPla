import io
import re
from typing import Any

import pdfplumber

from app.core.logger import get_logger
from app.schemas import CompanyFormat, ExtractedFieldResult

logger = get_logger()


class PDFExtractor:
    def __init__(self, company_format: CompanyFormat):
        self.format = company_format

    def extract_from_bytes(self, pdf_bytes: bytes) -> list[ExtractedFieldResult]:
        """PDFバイト列を受け取り、設定ルールに従って抽出結果を返す"""
        if not pdf_bytes:
            raise ValueError("PDFデータが空です。")

        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                return self._process_pdf(pdf)
        except Exception as e:
            logger.error(f"Failed to parse PDF bytes: {e}", exc_info=True)
            raise

    def extract_from_path(self, file_path: str) -> list[ExtractedFieldResult]:
        """ファイルパスからPDFを読み込んで抽出結果を返す"""
        try:
            with pdfplumber.open(file_path) as pdf:
                return self._process_pdf(pdf)
        except Exception as e:
            logger.error(f"Failed to parse PDF file at {file_path}: {e}", exc_info=True)
            raise

    def _process_pdf(self, pdf: pdfplumber.PDF) -> list[ExtractedFieldResult]:
        if not pdf.pages:
            logger.warning("PDF has no pages")
            return []

        # 全ページの生テキストを結合
        full_text = ""
        for i, page in enumerate(pdf.pages):
            try:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
            except Exception as e:
                logger.warning(f"Error extracting text from page {i}: {e}")

        # 全ページの表（Table）を収集
        all_tables = []
        for i, page in enumerate(pdf.pages):
            try:
                tables = page.extract_tables()
                if tables:
                    all_tables.extend(tables)
            except Exception as e:
                logger.warning(f"Error extracting tables from page {i}: {e}")

        results: list[ExtractedFieldResult] = []

        for rule in self.format.rules:
            extracted_val = None

            try:
                if rule.method == "keyword_after":
                    extracted_val = self._extract_keyword_after(full_text, rule.keyword)
                elif rule.method == "regex":
                    extracted_val = self._extract_regex(full_text, rule.pattern)
                elif rule.method == "table":
                    extracted_val = self._extract_table(all_tables, rule.table_index or 0)
            except Exception as e:
                logger.error(f"Error applying rule '{rule.field_name}' ({rule.method}): {e}", exc_info=True)

            results.append(
                ExtractedFieldResult(
                    field_name=rule.field_name,
                    excel_cell=rule.excel_cell,
                    excel_start_cell=rule.excel_start_cell,
                    method=rule.method,
                    value=extracted_val,
                )
            )

        return results

    def _extract_keyword_after(self, text: str, keyword: str | None) -> str | None:
        """指定したキーワードの直後にある文字列・数値を抽出"""
        if not keyword:
            return None
        try:
            # キーワードの後に続くコロンやスペースを許容し、次の単語または行末までを取得
            pattern = rf"{re.escape(keyword)}[：:\s]*([^\n\r]+)"
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        except re.error as e:
            logger.warning(f"Regex error for keyword '{keyword}': {e}")
        return None

    def _extract_regex(self, text: str, pattern: str | None) -> str | None:
        """正規表現にマッチした第1キャプチャグループ（または全体）を抽出"""
        if not pattern:
            return None
        try:
            match = re.search(pattern, text)
            if match:
                # キャプチャグループが存在すればそれを、無ければ全体を返す
                if match.groups():
                    return match.group(1).strip()
                return match.group(0).strip()
        except re.error as e:
            logger.warning(f"Invalid regex pattern '{pattern}': {e}")
        return None

    def _extract_table(
        self, tables: list[Any], table_index: int
    ) -> list[list[str]] | None:
        """PDF内から指定インデックスのテーブルを二次元配列として抽出・クレンジング"""
        if 0 <= table_index < len(tables):
            raw_table = tables[table_index]
            cleaned_table = []
            for row in raw_table:
                # Noneを空文字にし、セル内改行を半角スペースに置換
                cleaned_row = [
                    (cell.replace("\n", " ").strip() if cell is not None else "")
                    for cell in row
                ]
                # すべてのセルが空行の行は除外
                if any(cleaned_row):
                    cleaned_table.append(cleaned_row)
            return cleaned_table
        return None

