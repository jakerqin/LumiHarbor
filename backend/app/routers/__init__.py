"""
Routers Package

存放所有 API 路由模块，每个模块负责一组相关的端点。
使用 FastAPI APIRouter 实现路由模块化。

路由模块说明：
    assets: 资源相关路由（查询、列表、详情等）
    management: 管理任务路由（导入、清理、批处理等）
"""
from .assets import router as assets_router
from .management import router as management_router

__all__ = [
    'assets_router',
    'management_router',
]
