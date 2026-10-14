"""素材处理器

负责单个素材的元数据提取、标签保存、缩略图生成、预览图生成等处理逻辑。
"""
from sqlalchemy.orm import Session
from ...model import Asset, TaskLog
from ...services.metadata import MetadataExtractorFactory
from ...services.thumbnail import ThumbnailGeneratorFactory
from ...services.preview import PreviewGeneratorFactory, needs_preview
from ...services.tags import TagService, MetadataTagMapper
from ...services.tags.mapping_service import TagMappingService
from ...services.tasks import TaskDefinitionService
from ...tasks.phash_tasks import calculate_phash_task
from ...tasks.geocoding_tasks import calculate_location_task
from ...tasks.face_detection_tasks import detect_faces_task
from ...tasks.clip_tasks import compute_clip_task
from ...tasks.sender import run_coroutine_sync
from ...tools.utils import get_logger
from .gps import resolve_coordinates
import os
from datetime import datetime
from decimal import Decimal
from typing import Optional, Tuple

logger = get_logger(__name__)


class AssetProcessor:
    """素材处理器

    职责：
    - 提取元数据
    - 保存标签（不含地理位置）
    - 生成缩略图
    - 生成预览图（针对 HEIC 等浏览器不支持的格式）
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
            mapped_tags = MetadataTagMapper.map_metadata_to_tags(
                metadata,
                TagMappingService.list_active(self.db, asset.asset_type),
            )

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

    def sync_gps_columns(self, asset: Asset, coords: Optional[Tuple[float, float]]) -> None:
        """把解析出的坐标写回 assets.gps_* 冗余列（地图足迹只读这两列）"""
        if coords is None:
            return
        latitude, longitude = coords
        asset.gps_latitude = Decimal(f"{latitude:.8f}")
        asset.gps_longitude = Decimal(f"{longitude:.8f}")
        self.db.commit()

    def generate_thumbnail(self, asset: Asset, original_path: str) -> bool:
        """生成缩略图

        Args:
            asset: 素材对象
            original_path: 原始文件相对路径

        Returns:
            是否成功
        """
        if not TaskDefinitionService.is_enabled(self.db, 'thumbnail'):
            logger.debug(f"跳过缩略图（任务已关闭）: asset {asset.id}")
            return True

        # 按 asset_id 命名：原文件名会撞（Live Photo 的 HEIC/MOV 同名、不同目录同名）
        thumb_rel_path = f"processed/thumbnails/{asset.id}_thumbnail.webp"

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

    def generate_preview(self, asset: Asset, original_path: str) -> bool:
        """生成预览图（针对 HEIC 等浏览器不支持的格式）

        Args:
            asset: 素材对象
            original_path: 原始文件相对路径

        Returns:
            是否成功（如果不需要生成预览图也返回 True）
        """
        if not TaskDefinitionService.is_enabled(self.db, 'preview'):
            logger.debug(f"跳过预览图（任务已关闭）: asset {asset.id}")
            return True

        # 检查是否需要生成预览图
        if not needs_preview(asset.mime_type):
            logger.debug(f"跳过预览图生成（格式已支持）: {asset.mime_type}")
            return True

        # 按 asset_id 命名，理由同缩略图
        preview_rel_path = f"processed/previews/{asset.id}_preview.webp"

        # 完整路径
        file_full_path = os.path.join(self.scan_path, original_path)
        preview_full_path = os.path.join(self.scan_path, preview_rel_path)

        logger.debug(f"生成预览图 - 原始: {file_full_path}")
        logger.debug(f"生成预览图 - 目标: {preview_full_path}")

        # 生成预览图
        if PreviewGeneratorFactory.generate(asset.asset_type, file_full_path, preview_full_path):
            asset.preview_path = preview_rel_path
            self.db.commit()
            logger.info(f"预览图生成成功: {preview_rel_path}")
            return True
        else:
            logger.warning(f"预览图生成失败: {original_path}")
            return False

    def send_async_tasks(
        self,
        asset: Asset,
        file_path: str,
        coords: Optional[Tuple[float, float]] = None
    ):
        """发送相关异步任务 (Phash, Geocoding)

        Args:
            asset: 素材对象
            file_path: 文件完整路径
            coords: (纬度, 经度)（可选，用于地理编码）
        """
        # 1. Phash 任务
        if TaskDefinitionService.is_enabled(self.db, 'phash'):
            self._send_phash_task(asset, file_path)
        else:
            logger.debug(f"跳过 phash（任务已关闭）: asset {asset.id}")

        # 2. Geocoding 任务
        if coords is not None:
            if TaskDefinitionService.is_enabled(self.db, 'geocoding'):
                self._send_geocoding_task(asset, coords)
            else:
                logger.debug(f"跳过地理编码（任务已关闭）: asset {asset.id}")

        # 3. 人脸 / 动物脸
        if TaskDefinitionService.is_enabled(self.db, 'face_detection'):
            self._send_face_task(asset)
        else:
            logger.debug(f"跳过脸检测（任务已关闭）: asset {asset.id}")

        # 4. 语义向量
        if TaskDefinitionService.is_enabled(self.db, 'compute_clip'):
            self._send_clip_task(asset)
        else:
            logger.debug(f"跳过语义向量（任务已关闭）: asset {asset.id}")

    def _send_phash_task(self, asset: Asset, file_path: str) -> None:
        try:
            task_log = TaskLog(
                task_type='phash',
                task_status='pending',
                asset_id=asset.id,
                task_params={'file_path': file_path, 'asset_type': asset.asset_type},
                retry_count=0,
                max_retries=0,
                created_at=datetime.now(),
            )
            self.db.add(task_log)
            self.db.commit()
            run_coroutine_sync(
                calculate_phash_task.kiq(
                    asset_id=asset.id,
                    file_path=file_path,
                    asset_type=asset.asset_type,
                )
            )
            logger.debug(f"Phash 异步任务已发送 - Asset ID: {asset.id}")
        except Exception as e:
            logger.warning(
                f"Phash 异步任务发送失败 - Asset ID: {asset.id}: {e}",
                exc_info=True,
            )

    def _send_face_task(self, asset: Asset) -> None:
        if asset.asset_type == "audio":
            return
        try:
            task_log = TaskLog(
                task_type="face_detection",
                task_status="pending",
                asset_id=asset.id,
                task_params={"asset_type": asset.asset_type},
                retry_count=0,
                max_retries=2,
                created_at=datetime.now(),
            )
            self.db.add(task_log)
            self.db.commit()
            run_coroutine_sync(detect_faces_task.kiq(asset_id=asset.id, task_log_id=task_log.id))
            logger.debug(f"脸检测任务已发送 - Asset ID: {asset.id}")
        except Exception as exc:
            logger.warning(f"脸检测任务发送失败 - Asset ID: {asset.id}: {exc}", exc_info=True)

    def _send_clip_task(self, asset: Asset) -> None:
        if asset.asset_type == "audio":
            return
        try:
            task_log = TaskLog(
                task_type="compute_clip",
                task_status="pending",
                asset_id=asset.id,
                task_params={"asset_type": asset.asset_type},
                retry_count=0,
                max_retries=2,
                created_at=datetime.now(),
            )
            self.db.add(task_log)
            self.db.commit()
            run_coroutine_sync(compute_clip_task.kiq(asset_id=asset.id, task_log_id=task_log.id))
            logger.debug(f"语义向量任务已发送 - Asset ID: {asset.id}")
        except Exception as exc:
            logger.warning(f"语义向量任务发送失败 - Asset ID: {asset.id}: {exc}", exc_info=True)

    def _send_geocoding_task(self, asset: Asset, coords: Tuple[float, float]) -> None:
        try:
            latitude, longitude = coords
            task_log = TaskLog(
                task_type='geocoding',
                task_status='pending',
                asset_id=asset.id,
                task_params={'latitude': latitude, 'longitude': longitude},
                retry_count=0,
                max_retries=3,
                created_at=datetime.now(),
            )
            self.db.add(task_log)
            self.db.commit()
            run_coroutine_sync(
                calculate_location_task.kiq(
                    asset_id=asset.id,
                    longitude=longitude,
                    latitude=latitude,
                    task_log_id=task_log.id,
                )
            )
            logger.debug(f"地理编码异步任务已发送 - Asset ID: {asset.id}")
        except Exception as e:
            logger.warning(
                f"地理编码异步任务发送失败 - Asset ID: {asset.id}: {e}",
                exc_info=True,
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

        # 2. 保存标签（元数据为空也要走：default_gps 在这里补进标签）
        mapped_tags = self.save_tags(asset, metadata)
        coords = resolve_coordinates(mapped_tags, metadata)
        self.sync_gps_columns(asset, coords)

        # 3. 生成缩略图
        self.generate_thumbnail(asset, original_path)

        # 4. 生成预览图（针对 HEIC 等浏览器不支持的格式）
        self.generate_preview(asset, original_path)

        # 5. 发送异步任务
        self.send_async_tasks(asset, file_full_path, coords)

        return True
