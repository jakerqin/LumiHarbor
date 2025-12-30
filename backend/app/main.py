"""FastAPI 应用入口

启动方式：
    方式1（推荐）: python run.py
    方式2: uvicorn app.main:app --reload
    方式3: python -m app.main
"""
from fastapi import FastAPI
from .config import settings
from .routers import assets_router, management_router


app = FastAPI(title=settings.PROJECT_NAME)


@app.get("/")
def read_root():
    """根路径欢迎信息"""
    return {"message": f"欢迎使用 {settings.PROJECT_NAME} API"}


# 注册路由模块
app.include_router(assets_router)
app.include_router(management_router)
