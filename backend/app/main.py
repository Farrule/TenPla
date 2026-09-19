from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.extractor import PDFExtractor
from app.schemas import (
    CompanyFormat,
    CompanySummary,
    ExtractedFieldResult,
    ExtractionResponse,
)
from app.services.excel_writer import ExcelWriter
from app.services.format_manager import FormatManager

format_manager = FormatManager()

app = FastAPI(title="TenPla API", version="0.1.0")

# CORS設定（Viteの開発ポートと将来のTauriを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "tauri://localhost",
        "http://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "TenPla API"}


@app.get("/api/formats", response_model=list[CompanySummary])
def get_format_list():
    """登録済みフォーマット一覧を取得"""
    return format_manager.list_formats()


@app.get("/api/formats/{company_id}", response_model=CompanyFormat)
def get_format_detail(company_id: str):
    """特定のフォーマット設定詳細を取得"""
    fmt = format_manager.get_format(company_id)
    if not fmt:
        raise HTTPException(status_code=404, detail="Format not found")
    return fmt


@app.post("/api/formats")
def create_or_update_format(company_format: CompanyFormat):
    """フォーマット設定を新規作成・更新保存"""
    format_manager.save_format(company_format)
    return {"status": "saved", "company_id": company_format.company_id}


@app.post("/api/extract", response_model=ExtractionResponse)
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


@app.post("/api/export-excel")
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
