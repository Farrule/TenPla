from pathlib import Path
from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from app.schemas import ExtractionResponse, ExtractedFieldResult
from app.services.format_manager import FormatManager
from app.services.extractor import PDFExtractor
from app.services.excel_writer import ExcelWriter

router = APIRouter(prefix="/api", tags=["extract"])
format_manager = FormatManager()

@router.post("/extract", response_model=ExtractionResponse)
async def extract_pdf_data(
    company_id: str = Form(..., description="抽出ルール対象の会社ID"),
    file: UploadFile = File(..., description="解析対象のPDFファイル"),
):
    """指定された会社フォーマットに従い、PDFからデータを抽出して返す"""
    fmt = format_manager.get_format(company_id)
    if not fmt:
        raise HTTPException(
            status_code=404, detail=f"Company format '{company_id}' not found"
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")

    pdf_bytes = await file.read()
    extractor = PDFExtractor(fmt)
    extracted_data = extractor.extract_from_bytes(pdf_bytes)

    return ExtractionResponse(
        company_id=fmt.company_id,
        company_name=fmt.company_name,
        extracted_data=extracted_data,
    )

@router.post("/export-excel")
async def export_excel(
    extracted_data: list[ExtractedFieldResult],
    company_id: str | None = None,
):
    """抽出データをExcelに書き込んでダウンロード返却"""
    # 会社別のExcelテンプレートが存在すれば指定（無ければ標準Workbookで生成）
    template_path = None
    if company_id:
        custom_tpl = Path(f"/workspace/backend/templates/{company_id}.xlsx")
        if custom_tpl.exists():
            template_path = str(custom_tpl)

    writer = ExcelWriter(template_path=template_path)
    excel_bytes = writer.write_data(extracted_data)

    filename = f"exported_{company_id or 'result'}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
