"""管理任务相关路由"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..db import get_db
from ..config import settings
from .. import model, schema
from ..services.historian import HistorianService
from ..tools.utils import get_logger
import os

# 配置日志
logger = get_logger()

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
    logger.info(f"开始触发历史素材导入任务 - created_by: {created_by}, visibility: {visibility}")

    nas_path = settings.NAS_DATA_PATH
    if not os.path.exists(nas_path):
        logger.error(f"NAS 数据路径不存在: {nas_path}")
        raise HTTPException(status_code=404, detail="NAS 数据路径未找到")

    logger.info(f"NAS 数据路径: {nas_path}")

    def run_import():
        logger.info("后台任务开始执行: 扫描目录获取素材数据")
        # 1. 扫描目录获取素材数据
        assets_data = HistorianService.scan_directory(nas_path, created_by, visibility)
        logger.info(f"扫描完成，共发现 {len(assets_data)} 个素材文件")

        imported_count = 0
        skipped_count = 0
        failed_count = 0

        for idx, data in enumerate(assets_data, 1):
            try:
                # 2. 检查是否已存在（简单去重基于路径，排除已删除的资源）
                existing = db.query(model.Asset).filter(
                    model.Asset.original_path == data['original_path'],
                    model.Asset.is_deleted == False
                ).first()
                if existing:
                    skipped_count += 1
                    logger.debug(f"[{idx}/{len(assets_data)}] 跳过已存在素材: {data['original_path']}")
                    continue

                # 3. 存入数据库
                new_asset = model.Asset(**data)
                db.add(new_asset)
                db.commit()
                db.refresh(new_asset)
                logger.info(f"[{idx}/{len(assets_data)}] 已导入素材 ID={new_asset.id}: {data['original_path']}")

                # 4. 生成预览图（后续可放入更深的异步队列）
                # 修复: thumbnail_path 应该存储相对于 nas_path 的完整相对路径
                thumb_rel_path = f"processed/thumbnails/{new_asset.id}.webp"
                thumb_full_path = os.path.join(nas_path, thumb_rel_path)
                original_full_path = os.path.join(nas_path, data['original_path'])

                logger.debug(f"生成缩略图 - 原始文件: {original_full_path}")
                logger.debug(f"生成缩略图 - 目标路径: {thumb_full_path}")

                if HistorianService.generate_thumbnail(original_full_path, thumb_full_path):
                    new_asset.thumbnail_path = thumb_rel_path
                    db.commit()
                    logger.info(f"缩略图生成成功: {thumb_rel_path}")
                    imported_count += 1
                else:
                    logger.warning(f"缩略图生成失败，但素材已导入: {data['original_path']}")
                    imported_count += 1

            except Exception as e:
                failed_count += 1
                logger.error(f"[{idx}/{len(assets_data)}] 导入素材失败: {data.get('original_path', 'unknown')} - 错误: {str(e)}")
                db.rollback()

        logger.info(f"导入任务完成 - 成功: {imported_count}, 跳过: {skipped_count}, 失败: {failed_count}")

    background_tasks.add_task(run_import)
    return schema.ApiResponse.success(data={"status": "Import task started in background"})
