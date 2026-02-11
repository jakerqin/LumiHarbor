"""Home Router 模块"""
from fastapi import APIRouter
from .featured import router as featured_router
from .timeline import router as timeline_router

# 创建主路由并包含子路由
router = APIRouter()
router.include_router(featured_router)
router.include_router(timeline_router)

__all__ = ['router']
