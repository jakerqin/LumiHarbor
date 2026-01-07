"""素材处理器

负责单个素材的元数据提取、标签保存、缩略图生成等处理逻辑。
"""
from sqlalchemy.orm import Session
from ...model import Asset
from ...services.metadata import MetadataExtractorFactory
from ...services.thumbnail import ThumbnailGeneratorFactory
from ...services.tags import TagService, MetadataTagMapper
from ...tasks.phash_tasks import calculate_phash_task
from ...tools.utils import get_logger
import os
import asyncio

logger = get_logger(__name__)


class AssetProcessor:
    """素材处理器

    职责：
    - 提取元数据
    - 保存标签
    - 生成缩略图
    - 发送异步任务
    """

    def __init__(self, db: Session, scan_path: str):
        """初始化处理器

        Args:
            db: 数据库会话
            scan_path: 扫描根路径
        """
        self.db = db
        self.scan_path = scan_path

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
        """保存标签

        Args:
            asset: 素材对象
            metadata: 元数据
        """
        if not metadata:
            return

        try:
            # 映射为统一格式
            mapped_tags = MetadataTagMapper.map_metadata_to_tags(metadata)

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

        # 2. 保存标签
        if metadata:
            self.save_tags(asset, metadata)

        # 3. 生成缩略图
        self.generate_thumbnail(asset, original_path)

        # 4. 发送异步任务
        self.send_phash_task(asset, file_full_path)

        return True
