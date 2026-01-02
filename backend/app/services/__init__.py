"""
服务层模块

提供素材处理的核心服务：
- scanning: 文件系统扫描
- metadata: 元数据提取
- thumbnail: 缩略图生成

所有服务遵循策略模式和工厂模式，支持扩展新的素材类型。
"""

# 导入扫描服务
from .scanning import FilesystemScanner

# 导入元数据服务
from .metadata import (
    MetadataExtractor,
    MetadataExtractorFactory,
    ImageMetadataExtractor,
    VideoMetadataExtractor
)

# 导入缩略图服务
from .thumbnail import (
    ThumbnailGenerator,
    ThumbnailGeneratorFactory,
    ImageThumbnailGenerator,
    VideoThumbnailGenerator
)

# 自动注册所有提取器和生成器
def _register_services():
    """注册所有服务实例到工厂"""
    # 注册元数据提取器
    MetadataExtractorFactory.register('image', ImageMetadataExtractor())
    MetadataExtractorFactory.register('video', VideoMetadataExtractor())

    # 注册缩略图生成器
    ThumbnailGeneratorFactory.register('image', ImageThumbnailGenerator())
    ThumbnailGeneratorFactory.register('video', VideoThumbnailGenerator())


# 初始化时自动注册
_register_services()


__all__ = [
    # 扫描服务
    'FilesystemScanner',

    # 元数据服务
    'MetadataExtractor',
    'MetadataExtractorFactory',
    'ImageMetadataExtractor',
    'VideoMetadataExtractor',

    # 缩略图服务
    'ThumbnailGenerator',
    'ThumbnailGeneratorFactory',
    'ImageThumbnailGenerator',
    'VideoThumbnailGenerator',
]
