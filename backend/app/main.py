"""FastAPI 应用入口
"""
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import settings
from .tools.utils import get_logger
from .routers import (
    assets_router,
    albums_router,
    ingestion_router,
    management_router,
    home_router,
    tags_router,
    notes_router,
    map_router,
)
from . import schema

logger = get_logger(__name__)

app = FastAPI(title=settings.PROJECT_NAME)

# 允许前端本地开发域名跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 本地媒体文件静态挂载（不鉴权场景）
media_base_path = f"/{(settings.MEDIA_BASE_PATH or 'media').strip('/')}"

if os.path.isdir(settings.NAS_DATA_PATH):
    app.mount(
        media_base_path,
        StaticFiles(directory=settings.NAS_DATA_PATH),
        name="media",
    )
    logger.info(f"✅ 媒体静态目录已挂载: {media_base_path} -> {settings.NAS_DATA_PATH}")
else:
    logger.warning(f"⚠️ NAS_DATA_PATH 目录不存在，跳过静态挂载: {settings.NAS_DATA_PATH}")


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
app.include_router(tags_router)
app.include_router(notes_router)
app.include_router(map_router)
