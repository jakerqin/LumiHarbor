"""元数据提取器抽象基类和工厂

遵循开闭原则和策略模式，支持扩展新的素材类型。
"""
from abc import ABC, abstractmethod
from typing import Dict, Tuple, Optional
from datetime import datetime
from ...tools.utils import get_logger

logger = get_logger(__name__)


class MetadataExtractor(ABC):
    """元数据提取器抽象基类

    所有元数据提取器必须实现 extract() 方法。
    """

    @abstractmethod
    def extract(self, file_path: str) -> Tuple[Dict, Optional[datetime]]:
        """提取文件的元数据

        Args:
            file_path: 文件完整路径

        Returns:
            Tuple[元数据字典, 拍摄时间]
            - 元数据字典: 包含文件的各种元数据信息
            - 拍摄时间: 素材的拍摄/创建时间，如果无法提取则返回 None
        """
        pass


class MetadataExtractorFactory:
    """元数据提取器工厂

    根据素材类型自动选择合适的提取器。
    """

    _extractors: Dict[str, MetadataExtractor] = {}

    @classmethod
    def register(cls, asset_type: str, extractor: MetadataExtractor):
        """注册元数据提取器

        Args:
            asset_type: 素材类型 ('image', 'video', 'document')
            extractor: 提取器实例
        """
        cls._extractors[asset_type] = extractor
        logger.debug(f"注册元数据提取器: {asset_type} -> {extractor.__class__.__name__}")

    @classmethod
    def create(cls, asset_type: str) -> Optional[MetadataExtractor]:
        """根据素材类型创建提取器

        Args:
            asset_type: 素材类型

        Returns:
            对应的提取器实例，如果不支持则返回 None
        """
        extractor = cls._extractors.get(asset_type)
        if not extractor:
            logger.warning(f"未找到元数据提取器: {asset_type}")
        return extractor

    @classmethod
    def extract(cls, asset_type: str, file_path: str) -> Tuple[Dict, Optional[datetime]]:
        """便捷方法：直接提取元数据

        Args:
            asset_type: 素材类型
            file_path: 文件路径

        Returns:
            Tuple[元数据字典, 拍摄时间]
        """
        extractor = cls.create(asset_type)
        if extractor:
            return extractor.extract(file_path)
        else:
            logger.warning(f"跳过元数据提取（不支持的类型）: {asset_type}")
            return {}, None
