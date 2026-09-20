from fastapi import APIRouter, HTTPException
from app.schemas import CompanyFormat, CompanySummary
from app.services.format_manager import FormatManager

router = APIRouter(prefix="/api/formats", tags=["formats"])
format_manager = FormatManager()

@router.get("", response_model=list[CompanySummary])
def get_format_list():
    """登録済みフォーマット一覧を取得"""
    return format_manager.list_formats()

@router.get("/{company_id}", response_model=CompanyFormat)
def get_format_detail(company_id: str):
    """特定のフォーマット設定詳細を取得"""
    fmt = format_manager.get_format(company_id)
    if not fmt:
        raise HTTPException(status_code=404, detail="Format not found")
    return fmt

@router.post("")
def create_or_update_format(company_format: CompanyFormat):
    """フォーマット設定を新規作成・更新保存"""
    format_manager.save_format(company_format)
    return {"status": "saved", "company_id": company_format.company_id}
