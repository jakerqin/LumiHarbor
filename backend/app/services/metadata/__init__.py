"""
元数据提取模块

负责从不同类型的素材文件中提取元数据。
"""
from .extractor import MetadataExtractor, MetadataExtractorFactory
from .image import ImageMetadataExtractor
from .video import VideoMetadataExtractor

__all__ = [
    'MetadataExtractor',
    'MetadataExtractorFactory',
    'ImageMetadataExtractor',
    'VideoMetadataExtractor',
]
