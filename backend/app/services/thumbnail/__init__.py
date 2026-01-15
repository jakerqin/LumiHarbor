"""
缩略图生成模块

负责为不同类型的素材生成预览缩略图。
"""
from .generator import ThumbnailGenerator, ThumbnailGeneratorFactory
from .image import ImageThumbnailGenerator, get_default_generator
from .video import VideoThumbnailGenerator

__all__ = [
    'ThumbnailGenerator',
    'ThumbnailGeneratorFactory',
    'ImageThumbnailGenerator',
    'VideoThumbnailGenerator',
    'get_default_generator',
]
