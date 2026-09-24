import io

import openpyxl
from openpyxl.utils import coordinate_to_tuple
from openpyxl.utils.exceptions import CellCoordinatesException

from app.core.logger import get_logger
from app.schemas import ExtractedFieldResult

logger = get_logger()


class ExcelWriter:
    def __init__(self, template: str | bytes | None = None):
        """
        template: ファイルパス（str）またはアップロードされたExcelバイナリ（bytes）
        """
        self.template = template

    def write_data(
        self,
        extracted_data: list[ExtractedFieldResult],
        sheet_name: str | None = None,
    ) -> bytes:
        """既存テンプレートまたは新規ブックにデータを転記してバイト列を返す"""
        wb: openpyxl.Workbook
        if isinstance(self.template, bytes):
            # アップロードされたバイナリから読み込み
            try:
                wb = openpyxl.load_workbook(io.BytesIO(self.template))
            except Exception as e:
                logger.error(f"Failed to load provided Excel template: {e}", exc_info=True)
                raise ValueError(f"提供されたExcelテンプレートファイルが無効です: {e}")
        else:
            # テンプレート指定がない場合は新規作成
            wb = openpyxl.Workbook()

        if sheet_name and sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
        else:
            ws = wb.active

        for item in extracted_data:
            val = item.value
            if val is None:
                continue

            try:
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
            except CellCoordinatesException as e:
                logger.warning(
                    f"Invalid cell coordinates for field '{item.field_name}' "
                    f"(cell={item.excel_cell}, start_cell={item.excel_start_cell}): {e}"
                )
            except Exception as e:
                logger.error(f"Error writing field '{item.field_name}' to Excel: {e}", exc_info=True)

        try:
            output_stream = io.BytesIO()
            wb.save(output_stream)
            wb.close()
            return output_stream.getvalue()
        except Exception as e:
            logger.error(f"Failed to save generated Excel workbook: {e}", exc_info=True)
            raise

