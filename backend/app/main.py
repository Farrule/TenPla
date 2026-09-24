from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers import extract, format, health, logs
from app.core.logger import get_logger, setup_logging

# ロガー初期化
logger = get_logger()

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


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTPException発生時のログ記録と統一レスポンス"""
    if exc.status_code >= 500:
        logger.error(f"HTTP {exc.status_code} Error on {request.method} {request.url.path}: {exc.detail}")
    elif exc.status_code >= 400:
        logger.warning(f"HTTP {exc.status_code} Warning on {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """リクエストバリデーション失敗時のハンドリング"""
    errors = exc.errors()
    logger.warning(f"Request validation failed on {request.method} {request.url.path}: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "リクエストパラメータの検証に失敗しました。", "errors": errors},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """キャッチされなかった未処理例外（500）のハンドリング"""
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "内部サーバーエラーが発生しました。", "error": str(exc)},
    )


app.include_router(health.router)
app.include_router(format.router)
app.include_router(extract.router)
app.include_router(logs.router)

if __name__ == "__main__":
    import uvicorn

    setup_logging("web")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)


