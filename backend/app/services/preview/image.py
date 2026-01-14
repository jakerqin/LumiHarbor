"""图片预览图生成器

将 HEIC 等浏览器不支持的格式转换为 WebP 格式，保持原始尺寸。
"""
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from .generator import PreviewGenerator
from ...tools.utils import get_logger

# 注册 HEIF/HEIC 解码器（支持苹果 HEIC 格式）
register_heif_opener()

logger = get_logger(__name__)


class ImagePreviewGenerator(PreviewGenerator):
    """图片预览图生成器

    特性：
    - 保持原始尺寸（不缩放）
    - EXIF 方向自动修正
    - WebP 格式输出（浏览器兼容性好）
    - 高质量压缩
    """

    def generate(
        self,
        source_path: str,
        dest_path: str,
    ) -> bool:
        """生成图片预览图（保持原始尺寸）

        Args:
            source_path: 原始图片路径
            dest_path: 预览图保存路径

        Returns:
            成功返回 True，失败返回 False
        """
        try:
            with Image.open(source_path) as img:
                # 自动根据 EXIF 方向旋转图片
                img = ImageOps.exif_transpose(img)

                # 确保目标目录存在
                self._ensure_dest_dir(dest_path)

                # 保存为 WebP 格式（保持原始尺寸）
                # 使用较高的质量以保证清晰度
                img.save(dest_path, "WEBP", quality=90, optimize=True)

                logger.debug(f"成功生成预览图: {dest_path}, 尺寸: {img.size}")
                return True

        except FileNotFoundError:
            logger.error(f"原始图片不存在: {source_path}")
        except OSError as e:
            logger.error(f"图像处理失败 {source_path}: {e}")
        except Exception as e:
            logger.error(f"生成预览图失败 {source_path}: {e}")

        return False