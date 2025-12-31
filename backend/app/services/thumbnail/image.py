"""图片缩略图生成器

使用 Pillow 库生成高质量的图片缩略图，支持 EXIF 方向自动修正。
"""
from PIL import Image, ImageOps
from typing import Tuple
from .generator import ThumbnailGenerator
from ...tools.utils import get_logger

logger = get_logger(__name__)


class ImageThumbnailGenerator(ThumbnailGenerator):
    """图片缩略图生成器

    特性：
    - 保持宽高比缩放
    - EXIF 方向自动修正
    - WebP 格式输出（体积小、质量高）
    - Lanczos 重采样算法（高质量）
    """

    def generate(
        self,
        source_path: str,
        dest_path: str,
        size: Tuple[int, int] = (400, 400)
    ) -> bool:
        """生成图片缩略图

        Args:
            source_path: 原始图片路径
            dest_path: 缩略图保存路径
            size: 最大尺寸 (width, height)，保持宽高比

        Returns:
            成功返回 True，失败返回 False
        """
        try:
            with Image.open(source_path) as img:
                # 自动根据 EXIF 方向旋转图片
                img = ImageOps.exif_transpose(img)

                # 缩放图片（保持宽高比）
                img.thumbnail(size, Image.Lanczos)

                # 确保目标目录存在
                self._ensure_dest_dir(dest_path)

                # 保存为 WebP 格式
                img.save(dest_path, "WEBP", quality=80, optimize=True)

                logger.debug(f"成功生成缩略图: {dest_path}, 尺寸: {img.size}")
                return True

        except FileNotFoundError:
            logger.error(f"原始图片不存在: {source_path}")
        except OSError as e:
            logger.error(f"图像处理失败 {source_path}: {e}")
        except Exception as e:
            logger.error(f"生成缩略图失败 {source_path}: {e}")

        return False
