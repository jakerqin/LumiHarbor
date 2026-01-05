"""本地文件系统扫描导入"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ...db import get_db
from ... import model, schema
from ...schema.ingestion import ScanRequest, ScanResponseData
from ...services import FilesystemScanner, MetadataExtractorFactory, ThumbnailGeneratorFactory
from ...services.tags import TagService, MetadataTagMapper
from ...tools.utils import get_logger
from ...tools.file_hash import calculate_file_hash
from ...tasks.phash_tasks import calculate_phash_task
import os

logger = get_logger(__name__)

router = APIRouter(
    prefix="/ingestion",
    tags=["Ingestion"],
)


@router.post("/scan", response_model=schema.ApiResponse[ScanResponseData])
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
    scan_path = request.source_path

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
                # 2. 计算文件哈希（用于精确去重）
                asset_type = data['asset_type']
                original_full_path = os.path.join(scan_path, data['original_path'])

                logger.debug(f"[{idx}/{len(assets_data)}] 计算文件哈希: {data['original_path']}")
                file_hash = calculate_file_hash(original_full_path, smart_mode=True)
                data['file_hash'] = file_hash

                # 3. 基于文件哈希去重（内容级别精确去重）
                existing = db.query(model.Asset).filter(
                    model.Asset.file_hash == file_hash,
                    model.Asset.is_deleted == False
                ).first()

                if existing:
                    # 检查是否为完全相同的文件（路径也相同）
                    if existing.original_path == data['original_path']:
                        skipped_count += 1
                        logger.debug(
                            f"[{idx}/{len(assets_data)}] 跳过已存在素材: {data['original_path']} "
                            f"(hash: {file_hash[:16]}...)"
                        )
                        continue
                    else:
                        # 相同内容，不同路径（重复备份/副本）
                        skipped_count += 1
                        logger.info(
                            f"[{idx}/{len(assets_data)}] 发现重复备份文件: "
                            f"新路径={data['original_path']}, "
                            f"已有路径={existing.original_path}, "
                            f"hash={file_hash[:16]}..."
                        )
                        continue

                # 4. 提取元数据

                metadata, shot_at = MetadataExtractorFactory.extract(asset_type, original_full_path)

                # 使用元数据中的拍摄时间，如果没有则使用文件创建时间
                if shot_at:
                    data['shot_at'] = shot_at
                else:
                    data['shot_at'] = data['file_created_at']

                # 移除临时字段
                data.pop('file_created_at', None)

                # 5. 存入数据库
                new_asset = model.Asset(**data)
                db.add(new_asset)
                db.commit()
                db.refresh(new_asset)
                logger.info(
                    f"[{idx}/{len(assets_data)}] 已导入素材 ID={new_asset.id}: {data['original_path']} "
                    f"(hash: {file_hash[:16]}...)"
                )

                # 6. 保存元数据标签（支持 image 和 video）
                if metadata:
                    try:
                        # 将元数据映射为统一格式
                        mapped_tags = MetadataTagMapper.map_metadata_to_tags(metadata)

                        # 批量保存标签（自动根据 asset_type 匹配模板）
                        saved_count = TagService.batch_save_asset_tags(
                            db=db,
                            asset_id=new_asset.id,
                            asset_type=asset_type,  # 'image' 或 'video'
                            tag_data=mapped_tags
                        )

                        if saved_count > 0:
                            logger.debug(f"Asset {new_asset.id} ({asset_type}) 保存了 {saved_count} 个标签")

                    except Exception as tag_error:
                        # 标签保存失败不影响素材导入
                        logger.warning(f"Asset {new_asset.id} 标签保存失败: {tag_error}")

                # 7. 生成预览图
                # 提取原始文件名（不含扩展名）
                original_filename = os.path.basename(data['original_path'])
                filename_without_ext = os.path.splitext(original_filename)[0]

                # 生成缩略图文件名：原始文件名_thumbnail.webp
                thumb_filename = f"{filename_without_ext}_thumbnail.webp"
                thumb_rel_path = f"processed/thumbnails/{thumb_filename}"
                thumb_full_path = os.path.join(scan_path, thumb_rel_path)

                logger.debug(f"生成缩略图 - 原始文件: {original_full_path}")
                logger.debug(f"生成缩略图 - 目标路径: {thumb_full_path}")

                if ThumbnailGeneratorFactory.generate(asset_type, original_full_path, thumb_full_path):
                    new_asset.thumbnail_path = thumb_rel_path
                    db.commit()
                    logger.info(f"缩略图生成成功: {thumb_rel_path}")
                else:
                    logger.warning(f"缩略图生成失败，但素材已导入: {data['original_path']}")

                # 8. 发送异步任务计算感知哈希（不阻塞导入流程）
                try:
                    # 使用 kiq() 发送异步任务到 Redis 队列
                    # 注意：kiq() 返回协程，需要在事件循环中执行
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(
                        calculate_phash_task.kiq(
                            asset_id=new_asset.id,
                            file_path=original_full_path,
                            asset_type=asset_type
                        )
                    )
                    loop.close()
                    logger.debug(f"✅ Phash 异步任务已发送 - Asset ID: {new_asset.id}")
                except Exception as task_error:
                    # 异步任务发送失败不影响导入流程
                    logger.warning(f"⚠️ Phash 异步任务发送失败 - Asset ID: {new_asset.id}: {task_error}")

                imported_count += 1

            except Exception as e:
                failed_count += 1
                logger.error(f"[{idx}/{len(assets_data)}] 导入素材失败: {data.get('original_path', 'unknown')} - 错误: {str(e)}")
                db.rollback()

        logger.info(f"导入任务完成 - 成功: {imported_count}, 跳过: {skipped_count}, 失败: {failed_count}")

    background_tasks.add_task(run_import)
    return schema.ApiResponse.success(
        data=ScanResponseData(
            status="scanning",
            path=scan_path
        ),
        message="素材扫描任务已在后台启动"
    )
