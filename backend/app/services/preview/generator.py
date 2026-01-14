"""预览图生成器抽象基类和工厂

用于生成浏览器兼容的预览图（如将 HEIC 转换为 WebP）。
"""
import os
from abc import ABC, abstractmethod
from typing import Dict, Optional
from ...tools.utils import get_logger

logger = get_logger(__name__)

# 需要生成预览图的 MIME 类型（浏览器不支持的格式）
PREVIEW_REQUIRED_MIME_TYPES = {
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
}


def needs_preview(mime_type: str) -> bool:
    """判断是否需要生成预览图

    Args:
        mime_type: MIME 类型

    Returns:
        如果是浏览器不支持的格式则返回 True
    """
    if not mime_type:
        return False
    return mime_type.lower() in PREVIEW_REQUIRED_MIME_TYPES


class PreviewGenerator(ABC):
    """预览图生成器抽象基类

    所有预览图生成器必须实现 generate() 方法。
    """

    @abstractmethod
    def generate(
        self,
        source_path: str,
        dest_path: str,
    ) -> bool:
        """生成预览图（保持原始尺寸）

        Args:
            source_path: 原始文件完整路径
            dest_path: 预览图保存路径

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


class PreviewGeneratorFactory:
    """预览图生成器工厂

    根据素材类型自动选择合适的生成器。
    """

    _generators: Dict[str, PreviewGenerator] = {}

    @classmethod
    def register(cls, asset_type: str, generator: PreviewGenerator):
        """注册预览图生成器

        Args:
            asset_type: 素材类型 ('image', 'video')
            generator: 生成器实例
        """
        cls._generators[asset_type] = generator
        logger.debug(f"注册预览图生成器: {asset_type} -> {generator.__class__.__name__}")

    @classmethod
    def create(cls, asset_type: str) -> Optional[PreviewGenerator]:
        """根据素材类型创建生成器

        Args:
            asset_type: 素材类型

        Returns:
            对应的生成器实例，如果不支持则返回 None
        """
        generator = cls._generators.get(asset_type)
        if not generator:
            logger.warning(f"未找到预览图生成器: {asset_type}")
        return generator

    @classmethod
    def generate(
        cls,
        asset_type: str,
        source_path: str,
        dest_path: str,
    ) -> bool:
        """便捷方法：直接生成预览图

        Args:
            asset_type: 素材类型
            source_path: 原始文件路径
            dest_path: 预览图保存路径

        Returns:
            生成成功返回 True，失败返回 False
        """
        generator = cls.create(asset_type)
        if generator:
            return generator.generate(source_path, dest_path)
        else:
            logger.warning(f"跳过预览图生成（不支持的类型）: {asset_type}")
            return False