"""FastAPI 应用入口
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from .config import settings
from .routers import (
    assets_router,
    albums_router,
    ingestion_router,
    management_router,
    home_router,
    favorite_router
)
from . import schema


app = FastAPI(title=settings.PROJECT_NAME)


# 全局异常处理器

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """处理 HTTPException,返回统一格式的错误响应"""
    return JSONResponse(
        status_code=exc.status_code,
        content=schema.ApiResponse.error(
            code=str(exc.status_code),
            message=exc.detail
        ).model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理所有未捕获的异常,返回统一格式的错误响应"""
    return JSONResponse(
        status_code=500,
        content=schema.ApiResponse.error(
            code="500",
            message=f"服务器内部错误: {str(exc)}"
        ).model_dump()
    )


@app.get("/", response_model=schema.ApiResponse[dict])
def read_root():
    """根路径欢迎信息"""
    return schema.ApiResponse.success(data={"message": f"欢迎使用 {settings.PROJECT_NAME} API"})


# 注册路由模块
app.include_router(assets_router)
app.include_router(albums_router)
app.include_router(ingestion_router)
app.include_router(management_router)
app.include_router(home_router)
app.include_router(favorite_router)
