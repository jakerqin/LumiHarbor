"""缩略图生成器抽象基类和工厂

遵循开闭原则和策略模式，支持扩展新的素材类型。
"""
import os
from abc import ABC, abstractmethod
from typing import Dict, Tuple, Optional
from ...tools.utils import get_logger

logger = get_logger(__name__)


class ThumbnailGenerator(ABC):
    """缩略图生成器抽象基类

    所有缩略图生成器必须实现 generate() 方法。
    """

    @abstractmethod
    def generate(
        self,
        source_path: str,
        dest_path: str,
        size: Tuple[int, int] = (400, 400)
    ) -> bool:
        """生成缩略图

        Args:
            source_path: 原始文件完整路径
            dest_path: 缩略图保存路径
            size: 缩略图最大尺寸 (width, height)

        Returns:
            生成成功返回 True，失败返回 False
        """
        pass

    def _ensure_dest_dir(self, dest_path: str):
        """确保目标目录存在

        Args:
            dest_path: 目标文件路径
        """
        dest_dir = os.path.dirname(dest_path)
        if dest_dir:
            os.makedirs(dest_dir, exist_ok=True)


class ThumbnailGeneratorFactory:
    """缩略图生成器工厂

    根据素材类型自动选择合适的生成器。
    """

    _generators: Dict[str, ThumbnailGenerator] = {}

    @classmethod
    def register(cls, asset_type: str, generator: ThumbnailGenerator):
        """注册缩略图生成器

        Args:
            asset_type: 素材类型 ('image', 'video', 'document')
            generator: 生成器实例
        """
        cls._generators[asset_type] = generator
        logger.debug(f"注册缩略图生成器: {asset_type} -> {generator.__class__.__name__}")

    @classmethod
    def create(cls, asset_type: str) -> Optional[ThumbnailGenerator]:
        """根据素材类型创建生成器

        Args:
            asset_type: 素材类型

        Returns:
            对应的生成器实例，如果不支持则返回 None
        """
        generator = cls._generators.get(asset_type)
        if not generator:
            logger.warning(f"未找到缩略图生成器: {asset_type}")
        return generator

    @classmethod
    def generate(
        cls,
        asset_type: str,
        source_path: str,
        dest_path: str,
        size: Tuple[int, int] = (400, 400)
    ) -> bool:
        """便捷方法：直接生成缩略图

        Args:
            asset_type: 素材类型
            source_path: 原始文件路径
            dest_path: 缩略图保存路径
            size: 缩略图尺寸

        Returns:
            生成成功返回 True，失败返回 False
        """
        generator = cls.create(asset_type)
        if generator:
            return generator.generate(source_path, dest_path, size)
        else:
            logger.warning(f"跳过缩略图生成（不支持的类型）: {asset_type}")
            return False
