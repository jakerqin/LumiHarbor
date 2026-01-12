"""素材处理器

负责单个素材的元数据提取、标签保存、缩略图生成等处理逻辑。
"""
from sqlalchemy.orm import Session
from ...model import Asset, TaskLog
from ...services.metadata import MetadataExtractorFactory
from ...services.thumbnail import ThumbnailGeneratorFactory
from ...services.tags import TagService, MetadataTagMapper
from ...tasks.phash_tasks import calculate_phash_task
from ...tasks.geocoding_tasks import calculate_location_task
from ...tasks.sender import run_coroutine_sync
from ...tools.utils import get_logger
import os
from datetime import datetime

logger = get_logger(__name__)


class AssetProcessor:
    """素材处理器

    职责：
    - 提取元数据
    - 保存标签（不含地理位置）
    - 生成缩略图
    - 发送异步任务（phash、地理编码）
    """

    def __init__(self, db: Session, scan_path: str, default_gps: tuple[float, float] = None):
        """初始化处理器

        Args:
            db: 数据库会话
            scan_path: 扫描根路径
            default_gps: 默认经纬度 (longitude, latitude)
        """
        self.db = db
        self.scan_path = scan_path
        self.default_gps = default_gps

    @staticmethod
    def _format_send_task_error(exc: Exception) -> str:
        root = exc.__cause__ or exc.__context__
        if root:
            return f"{type(root).__name__}: {root}"
        return f"{type(exc).__name__}: {exc}"

    def extract_metadata(self, asset_type: str, file_path: str) -> tuple[dict, any]:
        """提取元数据

        Args:
            asset_type: 素材类型
            file_path: 文件完整路径

        Returns:
            (元数据字典, 拍摄时间)
        """
        return MetadataExtractorFactory.extract(asset_type, file_path)

    def save_tags(self, asset: Asset, metadata: dict) -> dict:
        """保存标签（支持默认 GPS 覆盖）

        Args:
            asset: 素材对象
            metadata: 元数据

        Returns:
            映射后的标签字典
        """
        if not metadata:
            metadata = {}

        try:
            # 映射为统一格式
            mapped_tags = MetadataTagMapper.map_metadata_to_tags(metadata)

            # GPS 覆盖逻辑：如果元数据中没有 GPS 且配置了默认 GPS，则使用默认值
            if self.default_gps:
                has_gps = 'gps_latitude' in mapped_tags and 'gps_longitude' in mapped_tags

                if not has_gps:
                    lng, lat = self.default_gps

                    # 根据数值正负确定方向
                    lat_ref = 'N' if lat >= 0 else 'S'
                    lon_ref = 'E' if lng >= 0 else 'W'

                    # 添加 GPS 标签（使用绝对值）
                    mapped_tags['gps_latitude'] = str(abs(lat))
                    mapped_tags['gps_longitude'] = str(abs(lng))
                    mapped_tags['gps_latitude_ref'] = lat_ref
                    mapped_tags['gps_longitude_ref'] = lon_ref

                    logger.debug(
                        f"Asset {asset.id} 使用默认 GPS: "
                        f"{lat}°{lat_ref}, {lng}°{lon_ref}"
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

            return mapped_tags

        except Exception as e:
            # 标签保存失败不影响素材导入
            logger.warning(f"Asset {asset.id} 标签保存失败: {e}")
            return {}



    @staticmethod
    def _parse_coordinate(coord_str: str, ref: str = None) -> float:
        """解析坐标字符串 (支持 [deg, min, sec] 格式)

        Args:
            coord_str: 坐标字符串, 例如 "[32, 6, 1167/100]"
            ref: 方向引用, 例如 "N", "S", "E", "W"

        Returns:
            float: 十进制坐标值
        """
        if not coord_str:
            return None

        try:
            # 1. 尝试解析 [deg, min, sec] 格式
            if '[' in coord_str and ']' in coord_str:
                clean_str = coord_str.strip("[]")
                parts = [p.strip() for p in clean_str.split(',')]

                if len(parts) == 3:
                    def parse_val(v_str):
                        if '/' in v_str:
                            n, d = v_str.split('/')
                            return float(n) / float(d)
                        return float(v_str)

                    deg = parse_val(parts[0])
                    min_val = parse_val(parts[1])
                    sec = parse_val(parts[2])

                    val = deg + (min_val / 60.0) + (sec / 3600.0)

                    # 根据引用处理正负 (S, W 为负)
                    if ref and ref.upper() in ['S', 'W']:
                        val = -val

                    return val

            # 2. 兼容旧格式 (e.g., "39.9042° N")
            coord_str = coord_str.replace('°', '').strip()
            parts = coord_str.split()
            value = float(parts[0])

            # 如果字符串中自带方向 (e.g. "39.9 N")
            if len(parts) > 1:
                direction = parts[1].upper()
                if direction in ['S', 'W']:
                    value = -value
            # 如果传入了 ref 参数
            elif ref and ref.upper() in ['S', 'W']:
                value = -value

            return value

        except (ValueError, IndexError, ZeroDivisionError):
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

    def send_async_tasks(self, asset: Asset, file_path: str, tags: dict = None):
        """发送相关异步任务 (Phash, Geocoding)

        Args:
            asset: 素材对象
            file_path: 文件完整路径
            tags: 标签字典（可选，用于地理编码）
        """
        # 1. Phash 任务
        try:
            run_coroutine_sync(
                calculate_phash_task.kiq(
                    asset_id=asset.id,
                    file_path=file_path,
                    asset_type=asset.asset_type
                )
            )
            logger.debug(f"✅ Phash 异步任务已发送 - Asset ID: {asset.id}")
        except Exception as e:
            logger.warning(
                f"⚠️ Phash 异步任务发送失败 - Asset ID: {asset.id}: {e}",
                exc_info=True
            )

        # 2. Geocoding 任务
        if tags and 'gps_latitude' in tags and 'gps_longitude' in tags:
            task_log = None
            try:
                # 获取坐标引用 (Ref)
                lat_ref = tags.get('gps_latitude_ref')
                lon_ref = tags.get('gps_longitude_ref')

                # 解析坐标 (传入 ref)
                latitude = self._parse_coordinate(tags.get('gps_latitude', ''), lat_ref)
                longitude = self._parse_coordinate(tags.get('gps_longitude', ''), lon_ref)

                if latitude is not None and longitude is not None:
                    # 创建任务日志
                    task_log = TaskLog(
                        task_type='geocoding',
                        task_status='pending',
                        asset_id=asset.id,
                        task_params={
                            'latitude': latitude,
                            'longitude': longitude
                        },
                        retry_count=0,
                        max_retries=3,
                        created_at=datetime.now()
                    )
                    self.db.add(task_log)
                    self.db.commit()

                    # 发送任务
                    run_coroutine_sync(
                        calculate_location_task.kiq(
                            asset_id=asset.id,
                            latitude=latitude,
                            longitude=longitude,
                            task_log_id=task_log.id
                        )
                    )
                    logger.debug(f"✅ 地理编码异步任务已发送 - Asset ID: {asset.id}, Task Log ID: {task_log.id}")
            except Exception as e:
                logger.warning(
                    f"⚠️ 地理编码异步任务发送失败 - Asset ID: {asset.id}: {e}",
                    exc_info=True
                )

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
        mapped_tags = {}
        if metadata:
            mapped_tags = self.save_tags(asset, metadata)

        # 3. 生成缩略图
        self.generate_thumbnail(asset, original_path)

        # 4. 发送异步任务
        self.send_async_tasks(asset, file_full_path, mapped_tags)

        return True
