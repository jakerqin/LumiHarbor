"""感知哈希异步任务

使用 Taskiq 异步计算图片和视频的感知哈希值。
"""
from .broker import broker
from ..tools.perceptual_hash import calculate_perceptual_hash
from ..db import SessionLocal
from .. import model
from ..tools.utils import get_logger

logger = get_logger(__name__)


@broker.task(task_name="calculate_phash")
async def calculate_phash_task(asset_id: int, file_path: str, asset_type: str) -> dict:
    """异步计算感知哈希任务

    Args:
        asset_id: 素材 ID
        file_path: 文件完整路径
        asset_type: 素材类型（'image', 'video', 'audio'）

    Returns:
        任务执行结果字典:
        {
            'success': bool,
            'asset_id': int,
            'phash': str | None,
            'message': str
        }

    说明:
        - 图片: 使用 average_hash 算法
        - 视频: 提取中间帧后计算哈希
        - 音频: 不支持,跳过
        - 计算成功后自动更新数据库
        - 失败会记录错误日志但不中断流程
    """
    logger.info(f"🚀 开始异步计算 phash - Asset ID: {asset_id}, Type: {asset_type}")

    try:
        # 1. 计算感知哈希
        phash = calculate_perceptual_hash(file_path, asset_type)

        if phash:
            # 2. 更新数据库
            db = SessionLocal()
            try:
                updated = db.query(model.Asset).filter(
                    model.Asset.id == asset_id
                ).update({'phash': phash})

                if updated:
                    db.commit()
                    logger.info(f"✅ Phash 计算成功 - Asset ID: {asset_id}, phash: {phash}")
                    return {
                        'success': True,
                        'asset_id': asset_id,
                        'phash': phash,
                        'message': 'Phash 计算并保存成功'
                    }
                else:
                    db.rollback()
                    logger.warning(f"⚠️ 数据库更新失败 - Asset ID: {asset_id} 不存在")
                    return {
                        'success': False,
                        'asset_id': asset_id,
                        'phash': None,
                        'message': '素材记录不存在'
                    }

            except Exception as db_error:
                db.rollback()
                logger.error(f"❌ 数据库更新失败 - Asset ID: {asset_id}: {db_error}")
                return {
                    'success': False,
                    'asset_id': asset_id,
                    'phash': phash,
                    'message': f'数据库错误: {str(db_error)}'
                }
            finally:
                db.close()

        else:
            # 音频或不支持的类型
            logger.debug(f"⏭️ Phash 计算跳过 - Asset ID: {asset_id}, Type: {asset_type}")
            return {
                'success': True,  # 跳过不算失败
                'asset_id': asset_id,
                'phash': None,
                'message': f'素材类型 {asset_type} 不支持感知哈希'
            }

    except Exception as e:
        logger.error(f"❌ Phash 计算失败 - Asset ID: {asset_id}: {e}", exc_info=True)
        return {
            'success': False,
            'asset_id': asset_id,
            'phash': None,
            'message': f'计算错误: {str(e)}'
        }


@broker.task(task_name="batch_calculate_phash")
async def batch_calculate_phash_task(asset_ids: list[int]) -> dict:
    """批量计算感知哈希任务

    Args:
        asset_ids: 素材 ID 列表

    Returns:
        批量执行结果:
        {
            'total': int,
            'success': int,
            'failed': int,
            'details': list[dict]
        }

    说明:
        用于批量补算缺失的 phash 值（如数据库迁移后）
    """
    logger.info(f"🚀 开始批量计算 phash - 数量: {len(asset_ids)}")

    results = {
        'total': len(asset_ids),
        'success': 0,
        'failed': 0,
        'details': []
    }

    db = SessionLocal()
    try:
        for asset_id in asset_ids:
            try:
                # 查询素材信息
                asset = db.query(model.Asset).filter(model.Asset.id == asset_id).first()

                if not asset:
                    logger.warning(f"⚠️ 素材不存在 - Asset ID: {asset_id}")
                    results['failed'] += 1
                    continue

                # 构建完整路径（假设 NAS_DATA_PATH 在配置中）
                from ..config import settings
                import os
                file_path = os.path.join(settings.NAS_DATA_PATH, asset.original_path)

                # 调用单个任务计算（同步调用，因为已经在异步任务中了）
                result = await calculate_phash_task(
                    asset_id=asset.id,
                    file_path=file_path,
                    asset_type=asset.asset_type
                )

                if result['success']:
                    results['success'] += 1
                else:
                    results['failed'] += 1

                results['details'].append(result)

            except Exception as e:
                logger.error(f"❌ 批量任务处理失败 - Asset ID: {asset_id}: {e}")
                results['failed'] += 1

    finally:
        db.close()

    logger.info(
        f"✅ 批量计算完成 - 总数: {results['total']}, "
        f"成功: {results['success']}, 失败: {results['failed']}"
    )

    return results
