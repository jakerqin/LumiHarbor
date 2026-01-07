"""素材导入服务

核心协调类，负责编排整个素材导入流程。
"""
from typing import List, Dict
from sqlalchemy.orm import Session
from ...model import Asset
from ...tools.utils import get_logger
from ..scanning import FilesystemScanner
from .config import ImportConfig
from .statistics import ImportStatistics
from .validator import AssetValidator
from .processor import AssetProcessor
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
        self.processor = AssetProcessor(config.db, config.scan_path)
        self.statistics = ImportStatistics()

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

        # 3. 记录结果
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
        try:
            # 1. 计算文件哈希 + 去重检查
            is_valid, file_hash, reason = self._validate_asset(index, data)
            if not is_valid:
                logger.debug(
                    f"[{index}/{self.statistics.total}] "
                    f"跳过: {data['original_path']} ({reason})"
                )
                self.statistics.record_skip()
                return

            # 2. 提取元数据 + 创建数据库记录
            asset = self._create_asset_record(data, file_hash)

            # 3. 处理素材（标签、缩略图、异步任务）
            self.processor.process_asset(asset, data['original_path'])

            logger.info(
                f"[{index}/{self.statistics.total}] "
                f"已导入素材 ID={asset.id}: {data['original_path']}"
            )

            self.statistics.record_success()

        except Exception as e:
            error_msg = str(e)
            logger.error(
                f"[{index}/{self.statistics.total}] "
                f"导入失败: {data.get('original_path', 'unknown')} - {error_msg}"
            )
            self.statistics.record_failure(data.get('original_path', 'unknown'), error_msg)
            self.config.db.rollback()

    def _validate_asset(self, index: int, data: Dict) -> tuple[bool, str, str]:
        """验证素材

        Args:
            index: 序号
            data: 素材数据

        Returns:
            (是否通过, 文件哈希, 拒绝原因)
        """
        original_full_path = os.path.join(self.config.scan_path, data['original_path'])

        logger.debug(f"[{index}/{self.statistics.total}] 计算文件哈希: {data['original_path']}")

        return self.validator.validate_asset(original_full_path, data['original_path'])

    def _create_asset_record(self, data: Dict, file_hash: str) -> Asset:
        """创建素材数据库记录

        Args:
            data: 素材数据
            file_hash: 文件哈希

        Returns:
            创建的素材对象
        """
        # 设置文件哈希
        data['file_hash'] = file_hash

        # 提取元数据获取拍摄时间
        asset_type = data['asset_type']
        original_full_path = os.path.join(self.config.scan_path, data['original_path'])

        metadata, shot_at = self.processor.extract_metadata(asset_type, original_full_path)

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
