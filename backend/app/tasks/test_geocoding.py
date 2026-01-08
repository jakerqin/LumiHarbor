"""测试异步地理编码功能

测试场景：
1. 创建测试任务日志
2. 手动触发地理编码异步任务
3. 验证任务状态更新
4. 验证地点标签保存

使用方法：
    python -m app.tasks.test_geocoding
"""
import asyncio
from app.db import SessionLocal
from app.model import Asset, TaskLog, AssetTag
from app.tasks.geocoding_tasks import calculate_location_task
from app.tools.utils import get_logger

logger = get_logger(__name__)


async def test_geocoding():
    """测试地理编码异步任务"""
    db = SessionLocal()

    try:
        # 1. 查找一个有 GPS 坐标的素材
        gps_asset = (
            db.query(Asset)
            .join(AssetTag, Asset.id == AssetTag.asset_id)
            .filter(AssetTag.tag_key == 'gps_latitude')
            .filter(AssetTag.is_deleted == False)
            .first()
        )

        if not gps_asset:
            logger.warning("⚠️ 未找到包含 GPS 坐标的素材，测试跳过")
            return

        # 2. 获取 GPS 坐标
        latitude_tag = (
            db.query(AssetTag)
            .filter(AssetTag.asset_id == gps_asset.id)
            .filter(AssetTag.tag_key == 'gps_latitude')
            .first()
        )
        longitude_tag = (
            db.query(AssetTag)
            .filter(AssetTag.asset_id == gps_asset.id)
            .filter(AssetTag.tag_key == 'gps_longitude')
            .first()
        )

        if not latitude_tag or not longitude_tag:
            logger.warning("⚠️ GPS 坐标不完整，测试跳过")
            return

        # 解析坐标
        def parse_coord(coord_str):
            coord_str = coord_str.replace('°', '').strip()
            parts = coord_str.split()
            value = float(parts[0])
            if len(parts) > 1 and parts[1].upper() in ['S', 'W']:
                value = -value
            return value

        latitude = parse_coord(latitude_tag.tag_value)
        longitude = parse_coord(longitude_tag.tag_value)

        logger.info(f"📍 测试素材: Asset ID {gps_asset.id}, GPS: ({latitude}, {longitude})")

        # 3. 创建任务日志
        task_log = TaskLog(
            task_type='geocoding',
            task_status='pending',
            asset_id=gps_asset.id,
            task_params={
                'latitude': latitude,
                'longitude': longitude
            },
            retry_count=0,
            max_retries=3
        )
        db.add(task_log)
        db.commit()

        logger.info(f"✅ 任务日志已创建: Task Log ID {task_log.id}")

        # 4. 执行异步任务
        logger.info("🚀 开始执行地理编码异步任务...")
        result = await calculate_location_task(
            asset_id=gps_asset.id,
            latitude=latitude,
            longitude=longitude,
            task_log_id=task_log.id
        )

        # 5. 验证结果
        logger.info(f"📊 任务执行结果: {result}")

        # 6. 查询任务状态
        db.refresh(task_log)
        logger.info(f"📋 任务状态: {task_log.task_status}")

        # 7. 查询保存的地点标签
        location_tags = (
            db.query(AssetTag)
            .filter(AssetTag.asset_id == gps_asset.id)
            .filter(AssetTag.tag_key.like('location_%'))
            .filter(AssetTag.is_deleted == False)
            .all()
        )

        if location_tags:
            logger.info(f"✅ 成功保存 {len(location_tags)} 个地点标签:")
            for tag in location_tags:
                logger.info(f"   - {tag.tag_key}: {tag.tag_value}")
        else:
            logger.warning("⚠️ 未保存任何地点标签")

        logger.info("✅ 测试完成！")

    except Exception as e:
        logger.error(f"❌ 测试失败: {e}", exc_info=True)

    finally:
        db.close()


if __name__ == '__main__':
    asyncio.run(test_geocoding())
