import io
from pathlib import Path

import openpyxl
from openpyxl.utils import coordinate_to_tuple

from app.schemas import ExtractedFieldResult


class ExcelWriter:
    def __init__(self, template_path: str | None = None):
        self.template_path = Path(template_path) if template_path else None

    def write_data(
        self,
        extracted_data: list[ExtractedFieldResult],
        sheet_name: str | None = None,
    ) -> bytes:
        """抽出データをExcelへ転記し、バイナリバイト列（.xlsx）として返す"""
        if self.template_path and self.template_path.exists():
            wb = openpyxl.load_workbook(self.template_path)
        else:
            # テンプレートが指定されていない場合は新規作成
            wb = openpyxl.Workbook()

        if sheet_name and sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
        else:
            ws = wb.active

        for item in extracted_data:
            val = item.value
            if val is None:
                continue

            # 単一項目の転記 (例: B2, B3)
            if item.excel_cell:
                ws[item.excel_cell] = val

            # テーブル項目の転記 (例: A7 から下方向へ展開)
            elif item.excel_start_cell and isinstance(val, list):
                start_row, start_col = coordinate_to_tuple(item.excel_start_cell)

                for r_idx, row_data in enumerate(val):
                    if isinstance(row_data, list):
                        for c_idx, cell_value in enumerate(row_data):
                            ws.cell(
                                row=start_row + r_idx,
                                column=start_col + c_idx,
                                value=cell_value,
                            )
                    else:
                        ws.cell(
                            row=start_row + r_idx,
                            column=start_col,
                            value=row_data,
                        )

        output_stream = io.BytesIO()
        wb.save(output_stream)
        wb.close()
        return output_stream.getvalue()
