"""管理任务相关路由"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..db import get_db
from ..config import settings
from .. import model, schema
from ..services.historian import HistorianService
import os

router = APIRouter(
    prefix="/tasks",
    tags=["Management"],
)


@router.post("/import-history", response_model=schema.ApiResponse[dict])
def trigger_history_import(
    created_by: int = 1,
    visibility: str = "general",
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """触发历史素材扫描与导入

    参数:
        created_by: 创建者用户ID（默认: 1）
        visibility: 素材可见性，可选 'general'(公共) 或 'private'(私有)（默认: general）

    返回:
        任务状态信息
    """
    nas_path = settings.NAS_DATA_PATH
    if not os.path.exists(nas_path):
        raise HTTPException(status_code=404, detail="NAS 数据路径未找到")

    def run_import():
        # 1. 扫描目录获取素材数据
        assets_data = HistorianService.scan_directory(nas_path, created_by, visibility)

        for data in assets_data:
            # 2. 检查是否已存在（简单去重基于路径，排除已删除的资源）
            existing = db.query(model.Asset).filter(
                model.Asset.original_path == data['original_path'],
                model.Asset.is_deleted == False
            ).first()
            if existing:
                continue

            # 3. 存入数据库
            new_asset = model.Asset(**data)
            db.add(new_asset)
            db.commit()
            db.refresh(new_asset)

            # 4. 生成预览图（后续可放入更深的异步队列）
            thumb_rel_path = f"thumbnails/{new_asset.id}.webp"
            thumb_full_path = os.path.join(nas_path, "processed", thumb_rel_path)
            original_full_path = os.path.join(nas_path, data['original_path'])

            if HistorianService.generate_thumbnail(original_full_path, thumb_full_path):
                new_asset.thumbnail_path = thumb_rel_path
                db.commit()

    background_tasks.add_task(run_import)
    return schema.ApiResponse.success(data={"status": "Import task started in background"})
