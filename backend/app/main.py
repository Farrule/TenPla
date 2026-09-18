from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services import format_manager
from app.schemas import CompanyFormat, CompanySummary

app = FastAPI(title="DocBridge API", version="0.1.0")

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
    return {"status": "ok", "service": "DocBridge API"}


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
