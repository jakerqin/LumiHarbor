"""系统管理任务路由

负责系统级的管理操作：
- 健康检查
- 系统统计
- 数据清理
- 维护任务
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from .. import schema, model
from ..tools.utils import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/management",
    tags=["Management"],
)


@router.get("/health", response_model=schema.ApiResponse[dict])
def health_check(db: Session = Depends(get_db)):
    """系统健康检查

    返回:
        系统健康状态信息
    """
    try:
        # 测试数据库连接
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        logger.error(f"数据库健康检查失败: {e}")
        db_status = "unhealthy"

    return schema.ApiResponse.success(data={
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "message": "系统运行正常" if db_status == "healthy" else "数据库连接异常"
    })


@router.get("/statistics", response_model=schema.ApiResponse[dict])
def get_statistics(db: Session = Depends(get_db)):
    """获取系统统计信息

    返回:
        系统统计数据（素材数量、存储使用等）
    """
    try:
        total_assets = db.query(model.Asset).filter(model.Asset.is_deleted == False).count()
        total_images = db.query(model.Asset).filter(
            model.Asset.asset_type == 'image',
            model.Asset.is_deleted == False
        ).count()
        total_videos = db.query(model.Asset).filter(
            model.Asset.asset_type == 'video',
            model.Asset.is_deleted == False
        ).count()

        return schema.ApiResponse.success(data={
            "total_assets": total_assets,
            "total_images": total_images,
            "total_videos": total_videos,
        })
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        return schema.ApiResponse.error(code="500", message=f"获取统计信息失败: {str(e)}")
