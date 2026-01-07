"""素材处理器

负责单个素材的元数据提取、标签保存、缩略图生成等处理逻辑。
"""
from sqlalchemy.orm import Session
from ...model import Asset
from ...services.metadata import MetadataExtractorFactory
from ...services.thumbnail import ThumbnailGeneratorFactory
from ...services.tags import TagService, MetadataTagMapper
from ...services.location import LocationService
from ...tasks.phash_tasks import calculate_phash_task
from ...tools.utils import get_logger
import os
import asyncio

logger = get_logger(__name__)


class AssetProcessor:
    """素材处理器

    职责：
    - 提取元数据
    - 保存标签（包括地理位置信息）
    - 生成缩略图
    - 发送异步任务
    """

    def __init__(self, db: Session, scan_path: str, amap_api_key: str = None):
        """初始化处理器

        Args:
            db: 数据库会话
            scan_path: 扫描根路径
            amap_api_key: 高德地图 API Key（可选）
        """
        self.db = db
        self.scan_path = scan_path
        self.location_service = LocationService(amap_api_key) if amap_api_key else None

    def extract_metadata(self, asset_type: str, file_path: str) -> tuple[dict, any]:
        """提取元数据

        Args:
            asset_type: 素材类型
            file_path: 文件完整路径

        Returns:
            (元数据字典, 拍摄时间)
        """
        return MetadataExtractorFactory.extract(asset_type, file_path)

    def save_tags(self, asset: Asset, metadata: dict):
        """保存标签（包括地理位置信息）

        Args:
            asset: 素材对象
            metadata: 元数据
        """
        if not metadata:
            return

        try:
            # 映射为统一格式
            mapped_tags = MetadataTagMapper.map_metadata_to_tags(metadata)

            # 如果有 GPS 坐标，提取地理位置信息
            if self.location_service:
                location_tags = self._extract_location_tags(mapped_tags)
                if location_tags:
                    mapped_tags.update(location_tags)
                    logger.debug(
                        f"Asset {asset.id} 添加了 {len(location_tags)} 个地理位置标签"
                    )

            # 批量保存标签
            saved_count = TagService.batch_save_asset_tags(
                db=self.db,
                asset_id=asset.id,
                asset_type=asset.asset_type,
                tag_data=mapped_tags
            )

            if saved_count > 0:
                logger.debug(f"Asset {asset.id} ({asset.asset_type}) 保存了 {saved_count} 个标签")

        except Exception as e:
            # 标签保存失败不影响素材导入
            logger.warning(f"Asset {asset.id} 标签保存失败: {e}")

    def _extract_location_tags(self, tags: dict) -> dict:
        """从 GPS 标签提取地理位置信息

        Args:
            tags: 标签字典

        Returns:
            地理位置标签字典
        """
        # 检查是否有 GPS 坐标
        latitude_str = tags.get('gps_latitude', '')
        longitude_str = tags.get('gps_longitude', '')

        if not latitude_str or not longitude_str:
            return {}

        try:
            # 转换为浮点数
            latitude = self._parse_coordinate(latitude_str)
            longitude = self._parse_coordinate(longitude_str)

            if latitude is None or longitude is None:
                return {}

            # 调用地理编码服务
            location_tags = self.location_service.extract_location_tags(latitude, longitude)

            return location_tags

        except Exception as e:
            logger.warning(f"提取地理位置信息失败: {e}")
            return {}

    @staticmethod
    def _parse_coordinate(coord_str: str) -> float:
        """解析坐标字符串为浮点数

        支持格式：
        - "39.9042° N" → 39.9042
        - "116.4074° E" → 116.4074
        - "-116.4074° W" → -116.4074
        - "39.9042" → 39.9042

        Args:
            coord_str: 坐标字符串

        Returns:
            浮点数坐标，解析失败返回 None
        """
        if not coord_str:
            return None

        try:
            # 移除度数符号和方向
            coord_str = coord_str.replace('°', '').strip()

            # 提取数字部分
            parts = coord_str.split()
            value = float(parts[0])

            # 处理方向（南纬和西经为负数）
            if len(parts) > 1:
                direction = parts[1].upper()
                if direction in ['S', 'W']:
                    value = -value

            return value

        except (ValueError, IndexError):
            return None

    def generate_thumbnail(self, asset: Asset, original_path: str) -> bool:
        """生成缩略图

        Args:
            asset: 素材对象
            original_path: 原始文件相对路径

        Returns:
            是否成功
        """
        # 提取原始文件名（不含扩展名）
        original_filename = os.path.basename(original_path)
        filename_without_ext = os.path.splitext(original_filename)[0]

        # 生成缩略图文件名
        thumb_filename = f"{filename_without_ext}_thumbnail.webp"
        thumb_rel_path = f"processed/thumbnails/{thumb_filename}"

        # 完整路径
        file_full_path = os.path.join(self.scan_path, original_path)
        thumb_full_path = os.path.join(self.scan_path, thumb_rel_path)

        logger.debug(f"生成缩略图 - 原始: {file_full_path}")
        logger.debug(f"生成缩略图 - 目标: {thumb_full_path}")

        # 生成缩略图
        if ThumbnailGeneratorFactory.generate(asset.asset_type, file_full_path, thumb_full_path):
            asset.thumbnail_path = thumb_rel_path
            self.db.commit()
            logger.info(f"缩略图生成成功: {thumb_rel_path}")
            return True
        else:
            logger.warning(f"缩略图生成失败: {original_path}")
            return False

    def send_phash_task(self, asset: Asset, file_path: str):
        """发送感知哈希异步任务

        Args:
            asset: 素材对象
            file_path: 文件完整路径
        """
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                calculate_phash_task.kiq(
                    asset_id=asset.id,
                    file_path=file_path,
                    asset_type=asset.asset_type
                )
            )
            loop.close()
            logger.debug(f"✅ Phash 异步任务已发送 - Asset ID: {asset.id}")
        except Exception as e:
            # 异步任务发送失败不影响导入流程
            logger.warning(f"⚠️ Phash 异步任务发送失败 - Asset ID: {asset.id}: {e}")

    def process_asset(self, asset: Asset, original_path: str) -> bool:
        """处理单个素材（一站式方法）

        Args:
            asset: 素材对象
            original_path: 原始文件相对路径

        Returns:
            是否完全成功
        """
        file_full_path = os.path.join(self.scan_path, original_path)

        # 1. 提取元数据
        metadata, shot_at = self.extract_metadata(asset.asset_type, file_full_path)

        # 2. 保存标签（包括地理位置信息）
        if metadata:
            self.save_tags(asset, metadata)

        # 3. 生成缩略图
        self.generate_thumbnail(asset, original_path)

        # 4. 发送异步任务
        self.send_phash_task(asset, file_full_path)

        return True
