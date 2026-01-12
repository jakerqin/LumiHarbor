"""素材导入服务

核心协调类，负责编排整个素材导入流程。
"""
from typing import List, Dict
from sqlalchemy.orm import Session
from ...model import Asset
from ...config import settings
from ...tools.utils import get_logger
from ...services.album import AlbumService
from ..scanning import FilesystemScanner
from .config import ImportConfig
from .statistics import ImportStatistics
from .validator import AssetValidator
from .processor import AssetProcessor
from .storage import IngestionStorageFactory, AssetStorageBackend, StagedAssetFile
import os

logger = get_logger(__name__)


class AssetImportService:
    """素材导入服务

    职责：
    - 编排导入流程
    - 协调各个组件
    - 不包含具体业务逻辑
    """

    def __init__(self, config: ImportConfig):
        """初始化导入服务

        Args:
            config: 导入配置
        """
        self.config = config
        self.validator = AssetValidator(config.db)
        self.storage: AssetStorageBackend = IngestionStorageFactory.create(
            settings.ASSET_STORAGE_PROVIDER,
            settings.NAS_DATA_PATH
        )
        self.storage.ensure_ready()
        self.processor = AssetProcessor(config.db, str(self.storage.processing_root), config.default_gps)
        self.statistics = ImportStatistics()
        self.imported_asset_ids = []  # 记录成功导入的素材ID列表

    def import_assets(self) -> ImportStatistics:
        """执行导入流程

        Returns:
            导入统计结果
        """
        logger.info(
            f"开始导入素材 - "
            f"路径: {self.config.scan_path}, "
            f"用户: {self.config.created_by}, "
            f"可见性: {self.config.visibility}"
        )

        # 1. 扫描目录获取素材数据
        assets_data = self._scan_directory()

        # 2. 逐个处理素材
        for idx, data in enumerate(assets_data, 1):
            self._process_single_asset(idx, data)

        # 3. 相册关联（如果需要）
        if self.config.import_to_album and self.imported_asset_ids:
            self._associate_assets_to_album()

        # 4. 记录结果
        logger.info(self.statistics.get_summary())

        return self.statistics

    def _scan_directory(self) -> List[Dict]:
        """扫描目录获取素材数据"""
        assets_data = FilesystemScanner.scan(
            self.config.scan_path,
            self.config.created_by,
            self.config.visibility
        )

        self.statistics.total = len(assets_data)
        logger.info(f"扫描完成，共发现 {self.statistics.total} 个素材文件")

        return assets_data

    def _process_single_asset(self, index: int, data: Dict):
        """处理单个素材

        Args:
            index: 序号（用于日志）
            data: 素材数据字典
        """
        source_rel_path = data.get('original_path', 'unknown')

        try:
            # 1. 计算文件哈希 + 去重检查 + 入库复制（如需要）
            is_valid, file_hash, staged, reason = self._validate_and_stage_asset(index, data)
            if not is_valid:
                logger.debug(
                    f"[{index}/{self.statistics.total}] "
                    f"跳过: {data['original_path']} ({reason})"
                )
                self.statistics.record_skip()
                return

            # 2. 提取元数据 + 创建数据库记录（original_path 必须是相对 NAS 根目录）
            data['original_path'] = staged.stored_path
            asset = self._create_asset_record(data, file_hash, staged.local_path)

            # 3. 处理素材（标签、缩略图、异步任务）
            self.processor.process_asset(asset, asset.original_path)

            # 4. 记录成功导入的素材ID
            self.imported_asset_ids.append(asset.id)

            logger.info(
                f"[{index}/{self.statistics.total}] "
                f"已导入素材 ID={asset.id}: {source_rel_path} -> {asset.original_path}"
            )

            self.statistics.record_success()

        except Exception as e:
            error_msg = str(e)
            logger.error(
                f"[{index}/{self.statistics.total}] "
                f"导入失败: {data.get('original_path', 'unknown')} - {error_msg}"
            )
            self.statistics.record_failure(source_rel_path, error_msg)
            self.config.db.rollback()

    def _validate_and_stage_asset(self, index: int, data: Dict) -> tuple[bool, str, StagedAssetFile, str]:
        """验证素材并确保文件已入库（复制到 NAS_DATA_PATH）

        Args:
            index: 序号
            data: 素材数据

        Returns:
            (是否通过, 文件哈希, 入库信息, 拒绝原因)
        """
        source_rel_path = data['original_path']
        source_full_path = os.path.join(self.config.scan_path, source_rel_path)

        logger.debug(f"[{index}/{self.statistics.total}] 计算文件哈希: {source_rel_path}")
        file_hash = self.validator.calculate_hash(source_full_path)
        staged = self.storage.plan_stage(source_full_path, file_hash, source_rel_path)

        is_duplicate, dup_type = self.validator.check_duplicate(file_hash, staged.stored_path)
        if is_duplicate:
            if dup_type == 'same':
                return False, file_hash, staged, "已存在相同文件"
            return False, file_hash, staged, "发现重复备份"

        self.storage.ensure_staged(staged, source_full_path)

        return True, file_hash, staged, ""

    def _create_asset_record(self, data: Dict, file_hash: str, file_full_path: str) -> Asset:
        """创建素材数据库记录

        Args:
            data: 素材数据
            file_hash: 文件哈希
            file_full_path: 文件完整路径（用于元数据提取）

        Returns:
            创建的素材对象
        """
        # 设置文件哈希
        data['file_hash'] = file_hash

        # 提取元数据获取拍摄时间
        asset_type = data['asset_type']
        metadata, shot_at = self.processor.extract_metadata(asset_type, file_full_path)

        # 使用元数据中的拍摄时间，如果没有则使用文件创建时间
        if shot_at:
            data['shot_at'] = shot_at
        else:
            data['shot_at'] = data.get('file_created_at')

        # 移除临时字段
        data.pop('file_created_at', None)

        # 创建数据库记录
        new_asset = Asset(**data)
        self.config.db.add(new_asset)
        self.config.db.commit()
        self.config.db.refresh(new_asset)

        return new_asset

    def _associate_assets_to_album(self) -> None:
        """将导入的素材关联到相册

        根据配置获取或创建相册，然后批量关联素材
        """
        try:
            logger.info(f"开始关联素材到相册 - 共 {len(self.imported_asset_ids)} 个素材")

            # 1. 获取或创建相册
            album, action = AlbumService.get_or_create_album(
                db=self.config.db,
                album_id=self.config.album_id,
                album_name=self.config.album_name,
                created_by=self.config.created_by,
                visibility=self.config.visibility,
                start_time=self.config.album_start_time,
                end_time=self.config.album_end_time
            )

            if not album:
                logger.error("相册获取或创建失败，跳过素材关联")
                return

            if action == "found":
                logger.info(f"使用现有相册: {album.name} (ID={album.id})")
            elif action == "created":
                logger.info(f"创建新相册: {album.name} (ID={album.id})")

            # 2. 批量关联素材到相册
            success_count, failed_ids = AlbumService.add_assets_to_album_batch(
                db=self.config.db,
                album_id=album.id,
                asset_ids=self.imported_asset_ids
            )

            logger.info(
                f"相册关联完成 - "
                f"成功: {success_count}, "
                f"失败: {len(failed_ids)}, "
                f"相册ID: {album.id}"
            )

            if failed_ids:
                logger.warning(f"以下素材关联失败: {failed_ids}")

        except Exception as e:
            logger.error(f"相册关联过程发生异常: {e}")
            # 相册关联失败不影响素材导入成功
            self.config.db.rollback()
