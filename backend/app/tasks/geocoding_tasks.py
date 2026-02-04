"""地理编码异步任务

使用 Taskiq 异步计算素材的地理位置信息。
"""
from .broker import broker
from ..services.location import LocationService
from ..services.tags import TagService
from ..db import SessionLocal
from .. import model
from ..tools.utils import get_logger
from ..config import settings
from datetime import datetime

logger = get_logger(__name__)


@broker.task(task_name="calculate_location", retry_on_error=True, max_retries=3)
async def calculate_location_task(
    asset_id: int,
    longitude: float,
    latitude: float,
    task_log_id: int = None
) -> dict:
    """异步计算地理位置信息任务

    Args:
        asset_id: 素材 ID
        longitude: GPS 经度
        latitude: GPS 纬度
        task_log_id: 任务日志 ID（用于更新任务状态）

    Returns:
        任务执行结果字典:
        {
            'success': bool,
            'asset_id': int,
            'location_tags_count': int,
            'message': str
        }

    说明:
        - 调用高德地图或 Nominatim API 进行逆地理编码
        - 保存 6 个地点标签到 asset_tags 表
        - 更新 task_logs 表记录任务状态
        - 失败重试 3 次后记录失败任务
    """
    logger.info(f"🚀 开始异步计算地理位置 - Asset ID: {asset_id}, GPS: ({longitude}, {latitude})")

    db = SessionLocal()
    try:
        # 1. 更新任务状态为 running
        if task_log_id:
            db.query(model.TaskLog).filter(model.TaskLog.id == task_log_id).update({
                'task_status': 'running',
                'executed_at': datetime.now()
            })
            db.commit()

        # 2. 调用地理编码服务
        location_service = LocationService(settings.AMAP_API_KEY or None)
        location_tags = location_service.extract_location_tags(latitude, longitude)

        if not location_tags:
            # 地理编码失败（可能是网络问题或坐标无效）
            error_msg = "地理编码服务返回空结果"
            logger.warning(f"⚠️ {error_msg} - Asset ID: {asset_id}")

            # 更新任务状态
            if task_log_id:
                _update_task_status(db, task_log_id, 'failed', error_msg)

            return {
                'success': False,
                'asset_id': asset_id,
                'location_tags_count': 0,
                'message': error_msg
            }

        # 3. 保存地点标签到 asset_tags
        # 先查询素材类型
        asset = db.query(model.Asset).filter(model.Asset.id == asset_id).first()
        if not asset:
            error_msg = "素材记录不存在"
            logger.warning(f"⚠️ {error_msg} - Asset ID: {asset_id}")

            if task_log_id:
                _update_task_status(db, task_log_id, 'failed', error_msg)

            return {
                'success': False,
                'asset_id': asset_id,
                'location_tags_count': 0,
                'message': error_msg
            }

        # 批量保存标签
        saved_count = TagService.batch_save_asset_tags(
            db=db,
            asset_id=asset_id,
            asset_type=asset.asset_type,
            tag_data=location_tags
        )

        # 4. 更新任务状态为 success
        if task_log_id:
            _update_task_status(db, task_log_id, 'success')

        logger.info(f"✅ 地理位置计算成功 - Asset ID: {asset_id}, 保存了 {saved_count} 个地点标签")
        return {
            'success': True,
            'asset_id': asset_id,
            'location_tags_count': saved_count,
            'message': f'成功保存 {saved_count} 个地点标签'
        }

    except Exception as e:
        error_msg = f'计算错误: {str(e)}'
        logger.error(f"❌ 地理位置计算失败 - Asset ID: {asset_id}: {e}", exc_info=True)

        # 更新任务状态为 failed（如果已达最大重试次数）
        if task_log_id:
            # 查询当前重试次数
            task_log = db.query(model.TaskLog).filter(model.TaskLog.id == task_log_id).first()
            if task_log:
                retry_count = task_log.retry_count + 1
                if retry_count >= task_log.max_retries:
                    # 达到最大重试次数，标记为失败
                    _update_task_status(db, task_log_id, 'failed', error_msg, retry_count)
                else:
                    # 更新重试次数
                    db.query(model.TaskLog).filter(model.TaskLog.id == task_log_id).update({
                        'retry_count': retry_count,
                        'error_message': error_msg,
                        'updated_at': datetime.now()
                    })
                    db.commit()

        return {
            'success': False,
            'asset_id': asset_id,
            'location_tags_count': 0,
            'message': error_msg
        }

    finally:
        db.close()


def _update_task_status(
    db,
    task_log_id: int,
    status: str,
    error_msg: str = None,
    retry_count: int = None
):
    """更新任务状态（内部辅助函数）

    Args:
        db: 数据库会话
        task_log_id: 任务日志 ID
        status: 任务状态（success, failed）
        error_msg: 错误信息（可选）
        retry_count: 重试次数（可选）
    """
    update_data = {
        'task_status': status,
        'updated_at': datetime.now()
    }

    if error_msg:
        update_data['error_message'] = error_msg

    if retry_count is not None:
        update_data['retry_count'] = retry_count

    db.query(model.TaskLog).filter(model.TaskLog.id == task_log_id).update(update_data)
    db.commit()
