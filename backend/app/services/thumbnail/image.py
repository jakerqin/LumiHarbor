"""图片缩略图生成器

使用 Pillow 和 smartcrop 库生成高质量的图片缩略图。
支持智能裁剪和基于宽高比的尺寸计算。
"""
from PIL import Image, ImageOps
from typing import Tuple, Optional
from pillow_heif import register_heif_opener
from smartcrop import SmartCrop
from .generator import ThumbnailGenerator
from ...tools.utils import get_logger

# 注册 HEIF/HEIC 解码器（支持苹果 HEIC 格式）
register_heif_opener()

logger = get_logger(__name__)

# 默认配置
DEFAULT_BASE_SIZE = 800  # 基准尺寸（长边像素）
DEFAULT_QUALITY = 92     # WebP 质量（0-100）


class ImageThumbnailGenerator(ThumbnailGenerator):
    """图片缩略图生成器

    特性：
    - 智能裁剪（基于内容分析，自动选择最佳裁剪区域）
    - 基于原图宽高比计算目标尺寸
    - EXIF 方向自动修正
    - WebP 格式输出（体积小、质量高）
    - Lanczos 重采样算法（高质量）
    """

    def __init__(
        self,
        base_size: int = DEFAULT_BASE_SIZE,
        quality: int = DEFAULT_QUALITY,
        use_smart_crop: bool = True
    ):
        """初始化生成器

        Args:
            base_size: 基准尺寸（长边像素），默认 800
            quality: WebP 输出质量（0-100），默认 92
            use_smart_crop: 是否使用智能裁剪，默认 True
        """
        self.base_size = base_size
        self.quality = quality
        self.use_smart_crop = use_smart_crop
        self._smart_crop = SmartCrop() if use_smart_crop else None

    def generate(
        self,
        source_path: str,
        dest_path: str,
        size: Tuple[int, int] = (400, 400)
    ) -> bool:
        """生成图片缩略图

        使用智能裁剪算法，根据原图宽高比计算目标尺寸。

        Args:
            source_path: 原始图片路径
            dest_path: 缩略图保存路径
            size: 最大尺寸提示 (width, height)，实际尺寸根据宽高比计算

        Returns:
            成功返回 True，失败返回 False
        """
        try:
            with Image.open(source_path) as img:
                # 自动根据 EXIF 方向旋转图片
                img = ImageOps.exif_transpose(img)

                # 计算基于宽高比的目标尺寸
                target_size = self._calculate_target_size(img.size)

                logger.debug(
                    f"原图尺寸: {img.size}, 目标尺寸: {target_size}, "
                    f"智能裁剪: {self.use_smart_crop}"
                )

                # 生成缩略图
                if self.use_smart_crop and self._smart_crop:
                    thumb = self._generate_smart_crop(img, target_size)
                else:
                    thumb = self._generate_simple_resize(img, target_size)

                # 确保目标目录存在
                self._ensure_dest_dir(dest_path)

                # 保存为 WebP 格式
                thumb.save(dest_path, "WEBP", quality=self.quality, optimize=True)

                logger.debug(f"成功生成缩略图: {dest_path}, 尺寸: {thumb.size}")
                return True

        except FileNotFoundError:
            logger.error(f"原始图片不存在: {source_path}")
        except OSError as e:
            logger.error(f"图像处理失败 {source_path}: {e}")
        except Exception as e:
            logger.error(f"生成缩略图失败 {source_path}: {e}")

        return False

    def _calculate_target_size(self, original_size: Tuple[int, int]) -> Tuple[int, int]:
        """根据原图宽高比计算目标尺寸

        保持原图宽高比，长边不超过 base_size。

        Args:
            original_size: 原图尺寸 (width, height)

        Returns:
            目标尺寸 (width, height)
        """
        orig_width, orig_height = original_size
        aspect_ratio = orig_width / orig_height

        if orig_width >= orig_height:
            # 横图：宽度为基准
            target_width = min(orig_width, self.base_size)
            target_height = int(target_width / aspect_ratio)
        else:
            # 竖图：高度为基准
            target_height = min(orig_height, self.base_size)
            target_width = int(target_height * aspect_ratio)

        # 确保尺寸至少为 1
        target_width = max(1, target_width)
        target_height = max(1, target_height)

        return (target_width, target_height)

    def _generate_smart_crop(
        self,
        img: Image.Image,
        target_size: Tuple[int, int]
    ) -> Image.Image:
        """使用智能裁剪生成缩略图

        smartcrop 会分析图片内容（人脸、边缘、颜色等），
        自动选择最佳裁剪区域。

        Args:
            img: PIL Image 对象
            target_size: 目标尺寸 (width, height)

        Returns:
            裁剪后的 PIL Image 对象
        """
        target_width, target_height = target_size

        # 如果原图比目标尺寸小，直接返回原图
        if img.width <= target_width and img.height <= target_height:
            return img.copy()

        try:
            # 使用 smartcrop 分析最佳裁剪区域
            # smartcrop 需要 RGB 模式
            if img.mode != 'RGB':
                analyze_img = img.convert('RGB')
            else:
                analyze_img = img

            result = self._smart_crop.crop(analyze_img, target_width, target_height)
            top_crop = result.get('top_crop')

            if top_crop:
                # 获取裁剪区域
                x = top_crop['x']
                y = top_crop['y']
                width = top_crop['width']
                height = top_crop['height']

                # 裁剪
                cropped = img.crop((x, y, x + width, y + height))

                # 缩放到目标尺寸
                thumb = cropped.resize(target_size, Image.Resampling.LANCZOS)

                logger.debug(
                    f"智能裁剪区域: ({x}, {y}, {width}x{height}), "
                    f"评分: {top_crop.get('score', {}).get('total', 'N/A')}"
                )

                return thumb

        except Exception as e:
            logger.warning(f"智能裁剪失败，降级到简单缩放: {e}")

        # 降级到简单缩放
        return self._generate_simple_resize(img, target_size)

    def _generate_simple_resize(
        self,
        img: Image.Image,
        target_size: Tuple[int, int]
    ) -> Image.Image:
        """简单缩放（保持宽高比）

        Args:
            img: PIL Image 对象
            target_size: 目标尺寸 (width, height)

        Returns:
            缩放后的 PIL Image 对象
        """
        # 创建副本避免修改原图
        thumb = img.copy()
        thumb.thumbnail(target_size, Image.Resampling.LANCZOS)
        return thumb


# 兼容旧版本：提供默认实例
_default_generator: Optional[ImageThumbnailGenerator] = None


def get_default_generator() -> ImageThumbnailGenerator:
    """获取默认生成器实例（单例）"""
    global _default_generator
    if _default_generator is None:
        _default_generator = ImageThumbnailGenerator()
    return _default_generator
