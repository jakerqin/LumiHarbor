"""本地文件系统扫描导入"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ...db import get_db
from ...config import settings
from ... import model, schema
from ...schema.ingestion import ScanRequest, ScanResponse
from ...services import FilesystemScanner, MetadataExtractorFactory, ThumbnailGeneratorFactory
from ...tools.utils import get_logger
import os

logger = get_logger(__name__)

router = APIRouter(
    prefix="/ingestion",
    tags=["Ingestion"],
)


@router.post("/scan", response_model=schema.ApiResponse[ScanResponse])
def scan_and_import(
    request: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """扫描文件系统并导入素材

    参数:
        request: 扫描请求参数
            - source_path: 扫描路径（默认使用配置的 NAS_DATA_PATH）
            - created_by: 创建者用户ID（默认: 1）
            - visibility: 素材可见性，可选 'general'(公共) 或 'private'(私有)（默认: general）

    返回:
        任务状态信息
    """
    # 使用指定路径或默认 NAS 路径
    scan_path = request.source_path or settings.NAS_DATA_PATH

    if not os.path.exists(scan_path):
        logger.error(f"扫描路径不存在: {scan_path}")
        raise HTTPException(status_code=404, detail=f"扫描路径不存在: {scan_path}")

    logger.info(f"触发素材扫描任务 - 路径: {scan_path}, 用户: {request.created_by}, 可见性: {request.visibility}")

    def run_import():
        logger.info("后台任务开始执行: 扫描目录获取素材数据")

        # 1. 扫描目录获取素材数据
        assets_data = FilesystemScanner.scan(scan_path, request.created_by, request.visibility)
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

                # 3. 提取元数据
                asset_type = data['asset_type']
                original_full_path = os.path.join(scan_path, data['original_path'])

                metadata, shot_at = MetadataExtractorFactory.extract(asset_type, original_full_path)

                # 使用元数据中的拍摄时间，如果没有则使用文件创建时间
                if shot_at:
                    data['shot_at'] = shot_at
                else:
                    data['shot_at'] = data['file_created_at']

                # 移除临时字段
                data.pop('file_created_at', None)

                # 4. 存入数据库
                new_asset = model.Asset(**data)
                db.add(new_asset)
                db.commit()
                db.refresh(new_asset)
                logger.info(f"[{idx}/{len(assets_data)}] 已导入素材 ID={new_asset.id}: {data['original_path']}")

                # 5. 生成预览图
                thumb_rel_path = f"processed/thumbnails/{new_asset.id}.webp"
                thumb_full_path = os.path.join(scan_path, thumb_rel_path)

                logger.debug(f"生成缩略图 - 原始文件: {original_full_path}")
                logger.debug(f"生成缩略图 - 目标路径: {thumb_full_path}")

                if ThumbnailGeneratorFactory.generate(asset_type, original_full_path, thumb_full_path):
                    new_asset.thumbnail_path = thumb_rel_path
                    db.commit()
                    logger.info(f"缩略图生成成功: {thumb_rel_path}")
                else:
                    logger.warning(f"缩略图生成失败，但素材已导入: {data['original_path']}")

                imported_count += 1

            except Exception as e:
                failed_count += 1
                logger.error(f"[{idx}/{len(assets_data)}] 导入素材失败: {data.get('original_path', 'unknown')} - 错误: {str(e)}")
                db.rollback()

        logger.info(f"导入任务完成 - 成功: {imported_count}, 跳过: {skipped_count}, 失败: {failed_count}")

    background_tasks.add_task(run_import)
    return schema.ApiResponse.success(
        data=ScanResponse(
            status="scanning",
            path=scan_path,
            message="素材扫描任务已在后台启动"
        )
    )
