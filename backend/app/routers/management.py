"""系统管理任务路由

负责系统级的管理操作：
- 健康检查
- 系统统计
- 数据清理
- 维护任务
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import schema, model
from ..services.face import FaceService
from ..services.tasks import TaskDefinitionService
from ..tasks.face_detection_tasks import detect_faces_task
from ..tasks.sender import run_coroutine_sync
from ..tools.utils import get_logger
from datetime import datetime

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

    qdrant_ok = False
    try:
        from ..services.vector_store import VectorStore
        qdrant_ok = VectorStore.instance().ping()
    except Exception as exc:
        logger.warning(f"Qdrant 健康检查失败: {exc}")

    healthy = db_status == "healthy"
    return schema.ApiResponse.success(data={
        "status": "healthy" if healthy and qdrant_ok else "degraded",
        "database": db_status,
        "qdrant": "healthy" if qdrant_ok else "unhealthy",
        "message": "系统运行正常" if healthy else "数据库连接异常"
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


@router.post("/faces/backfill", response_model=schema.ApiResponse[dict])
def backfill_faces(payload: schema.FaceBackfillRequest, db: Session = Depends(get_db)):
    """为历史素材补发 detect_faces。可按拍摄日期筛选；missing_only=false 会重扫已匹配过的图。"""
    if not TaskDefinitionService.is_enabled(db, "face_detection"):
        raise HTTPException(status_code=400, detail="脸检测任务已关闭")
    asset_ids = FaceService.assets_need_backfill(
        db,
        payload.asset_ids,
        payload.missing_only,
        payload.limit,
        (payload.shot_at_from, payload.shot_at_to),
    )
    queued = 0
    for asset_id in asset_ids:
        task_log = model.TaskLog(
            task_type="face_detection",
            task_status="pending",
            asset_id=asset_id,
            task_params={"source": "backfill"},
            retry_count=0,
            max_retries=2,
            created_at=datetime.now(),
        )
        db.add(task_log)
        db.commit()
        run_coroutine_sync(detect_faces_task.kiq(asset_id=asset_id, task_log_id=task_log.id))
        queued += 1
    return schema.ApiResponse.success(data={"queued": queued, "message": "已发送补算任务"})
