from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from pydantic import TypeAdapter

from app.schemas import ExtractedFieldResult, ExtractionResponse
from app.services.excel_writer import ExcelWriter
from app.services.extractor import PDFExtractor
from app.services.format_manager import FormatManager

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
    extracted_data: str = Form(..., description="抽出データのJSON文字列"),
    template_file: UploadFile | None = File(
        None, description="ベースとなるExcelテンプレート"
    ),
    company_id: str | None = Form(None),
):
    """
    アップロードされたテンプレートExcel（またはサーバー上のテンプレート）に
    抽出データを書き込んでダウンロード返却
    """
    try:
        # JSON文字列を List[ExtractedFieldResult] にパース
        adapter = TypeAdapter(list[ExtractedFieldResult])
        parsed_data = adapter.validate_json(extracted_data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid extracted_data JSON: {e}")

    template_bytes = None
    if template_file:
        # ユーザーが画面からアップロードしたファイル
        template_bytes = await template_file.read()

    writer = ExcelWriter(template=template_bytes)
    excel_bytes = writer.write_data(parsed_data)

    # 出力ファイル名の決定
    filename = (
        f"filled_{template_file.filename}"
        if template_file and template_file.filename
        else f"exported_{company_id or 'result'}.xlsx"
    )

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
