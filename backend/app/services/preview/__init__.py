"""
预览图生成模块

负责为浏览器不支持的格式（如 HEIC）生成 WebP 预览图。
"""
from .generator import PreviewGenerator, PreviewGeneratorFactory, needs_preview
from .image import ImagePreviewGenerator

# 注册图片预览图生成器
PreviewGeneratorFactory.register('image', ImagePreviewGenerator())

__all__ = [
    'PreviewGenerator',
    'PreviewGeneratorFactory',
    'ImagePreviewGenerator',
    'needs_preview',
]