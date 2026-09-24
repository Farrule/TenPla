from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status
from pydantic import TypeAdapter

from app.core.logger import get_logger
from app.schemas import ExtractedFieldResult, ExtractionResponse
from app.services.excel_writer import ExcelWriter
from app.services.extractor import PDFExtractor
from app.services.format_manager import FormatManager

router = APIRouter(prefix="/api", tags=["extract"])
format_manager = FormatManager()
logger = get_logger()


@router.post("/extract", response_model=ExtractionResponse)
async def extract_pdf_data(
    company_id: str = Form(..., description="抽出ルール対象の会社ID"),
    file: UploadFile = File(..., description="解析対象のPDFファイル"),
):
    """指定された会社フォーマットに従い、PDFからデータを抽出して返す"""
    if not company_id or not company_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="会社IDが指定されていません。",
        )

    fmt = format_manager.get_format(company_id)
    if not fmt:
        logger.warning(f"Company format '{company_id}' not found for PDF extraction")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"会社ID '{company_id}' のフォーマット設定が見つかりません。",
        )

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Uploaded file '{file.filename}' is not a PDF")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="アップロードされたファイルはPDF形式である必要があります。",
        )

    try:
        pdf_bytes = await file.read()
        if len(pdf_bytes) == 0:
            raise ValueError("ファイルの内容が空です。")
    except Exception as e:
        logger.error(f"Failed to read uploaded file '{file.filename}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"PDFファイルの読み込みに失敗しました: {e}",
        )

    try:
        extractor = PDFExtractor(fmt)
        extracted_data = extractor.extract_from_bytes(pdf_bytes)
        logger.info(f"Successfully extracted {len(extracted_data)} fields from '{file.filename}' using format '{company_id}'")
        return ExtractionResponse(
            company_id=fmt.company_id,
            company_name=fmt.company_name,
            extracted_data=extracted_data,
        )
    except Exception as e:
        logger.error(f"Failed to extract data from PDF '{file.filename}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDFデータの抽出処理中にエラーが発生しました: {e}",
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
    アップロードされたテンプレートExcel（または新規Excel）に
    抽出データを書き込んでダウンロード返却
    """
    try:
        adapter = TypeAdapter(list[ExtractedFieldResult])
        parsed_data = adapter.validate_json(extracted_data)
    except Exception as e:
        logger.error(f"Invalid extracted_data JSON received: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"抽出データの形式が正しくありません: {e}",
        )

    template_bytes = None
    if template_file and template_file.filename:
        if not (template_file.filename.lower().endswith(".xlsx") or template_file.filename.lower().endswith(".xlsm")):
            logger.warning(f"Uploaded template file '{template_file.filename}' is not an Excel file")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="テンプレートファイルは .xlsx または .xlsm 形式である必要があります。",
            )
        try:
            template_bytes = await template_file.read()
        except Exception as e:
            logger.error(f"Failed to read template file '{template_file.filename}': {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"テンプレートファイルの読み込みに失敗しました: {e}",
            )

    try:
        writer = ExcelWriter(template=template_bytes)
        excel_bytes = writer.write_data(parsed_data)
    except Exception as e:
        logger.error(f"Failed to generate Excel file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Excelファイルの生成中にエラーが発生しました: {e}",
        )

    # 出力ファイル名の決定
    filename = (
        f"filled_{template_file.filename}"
        if template_file and template_file.filename
        else f"exported_{company_id or 'result'}.xlsx"
    )

    logger.info(f"Successfully generated Excel export: {filename}")
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

