"""
Routers Package

存放所有 API 路由模块，每个模块负责一组相关的端点。
使用 FastAPI APIRouter 实现路由模块化。

路由模块说明：
    assets: 素材查询和管理（查询、列表、详情、收藏等）
    albums: 相册管理（创建、查询、更新、删除、素材管理）
    ingestion: 素材摄入（本地扫描、上传等）
    management: 系统管理任务（健康检查、统计、清理等）
    home: 首页相关（精选照片、时间轴、地点地图等）
    tags: 标签定义管理
    notes: 笔记管理
"""
from .assets import router as assets_router
from .albums import router as albums_router
from .ingestion.scan import router as ingestion_router
from .management import router as management_router
from .home import router as home_router
from .tags import router as tags_router
from .notes import router as notes_router

__all__ = [
    'assets_router',
    'albums_router',
    'ingestion_router',
    'management_router',
    'home_router',
    'tags_router',
    'notes_router',
]
