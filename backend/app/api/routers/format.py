from fastapi import APIRouter, HTTPException, status

from app.core.logger import get_logger
from app.schemas import CompanyFormat, CompanySummary
from app.services.format_manager import FormatManager

router = APIRouter(prefix="/api/formats", tags=["formats"])
format_manager = FormatManager()
logger = get_logger()


@router.get("", response_model=list[CompanySummary])
def get_format_list():
    """登録済みフォーマット一覧を取得"""
    try:
        return format_manager.list_formats()
    except Exception as e:
        logger.error(f"Failed to list formats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="フォーマット一覧の取得中にエラーが発生しました。",
        )


@router.get("/{company_id}", response_model=CompanyFormat)
def get_format_detail(company_id: str):
    """特定のフォーマット設定詳細を取得"""
    if not company_id or not company_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="会社IDが指定されていません。",
        )

    fmt = format_manager.get_format(company_id)
    if not fmt:
        logger.warning(f"Company format not found: {company_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"会社ID '{company_id}' のフォーマット設定が見つかりません。",
        )
    return fmt


@router.post("")
def create_or_update_format(company_format: CompanyFormat):
    """フォーマット設定を新規作成・更新保存"""
    if not company_format.company_id or not company_format.company_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="会社IDは必須です。",
        )

    try:
        format_manager.save_format(company_format)
        return {"status": "saved", "company_id": company_format.company_id}
    except Exception as e:
        logger.error(f"Failed to save format for '{company_format.company_id}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"フォーマット設定の保存に失敗しました: {e}",
        )


@router.delete("/{company_id}")
def delete_format(company_id: str):
    """特定のフォーマット設定を削除"""
    if not company_id or not company_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="会社IDが指定されていません。",
        )

    try:
        deleted = format_manager.delete_format(company_id)
        if not deleted:
            logger.warning(f"Cannot delete format; not found: {company_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"会社ID '{company_id}' の設定ファイルが見つかりません。",
            )
        return {"status": "deleted", "company_id": company_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete format for '{company_id}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"フォーマット設定の削除に失敗しました: {e}",
        )

