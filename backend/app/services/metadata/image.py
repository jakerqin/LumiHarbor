"""图片元数据提取器

支持从图片文件中提取 EXIF 元数据和拍摄时间。
"""
import exifread
from datetime import datetime
from typing import Dict, Tuple, Optional
from .extractor import MetadataExtractor
from ...tools.utils import get_logger

logger = get_logger(__name__)


class ImageMetadataExtractor(MetadataExtractor):
    """图片元数据提取器

    使用 exifread 库提取 EXIF 信息，包括：
    - 拍摄时间
    - 相机型号
    - 拍摄参数（光圈、快门、ISO 等）
    - GPS 位置信息
    """

    # EXIF 时间标签优先级
    DATETIME_TAGS = [
        'EXIF DateTimeOriginal',  # 原始拍摄时间（优先）
        'Image DateTime',          # 图片时间
        'EXIF DateTimeDigitized'   # 数字化时间
    ]

    # 排除的标签（体积大且无用）
    EXCLUDED_TAGS = {
        'JPEGThumbnail',
        'TIFFThumbnail',
        'Filename',
        'EXIF MakerNote'
    }

    def extract(self, file_path: str) -> Tuple[Dict, Optional[datetime]]:
        """提取图片的 EXIF 元数据

        Args:
            file_path: 图片文件完整路径

        Returns:
            Tuple[EXIF 元数据字典, 拍摄时间]
        """
        metadata = {}
        shot_at = None

        try:
            with open(file_path, 'rb') as f:
                tags = exifread.process_file(f, details=False)

                # 提取所有有用的标签
                for tag_name in tags.keys():
                    if tag_name not in self.EXCLUDED_TAGS:
                        metadata[tag_name] = str(tags[tag_name])

                # 提取拍摄时间
                shot_at = self._extract_datetime(tags)

            logger.debug(f"成功提取图片元数据: {file_path}, 标签数: {len(metadata)}")

        except FileNotFoundError:
            logger.error(f"图片文件不存在: {file_path}")
        except Exception as e:
            logger.error(f"解析图片 EXIF 失败 {file_path}: {e}")

        return metadata, shot_at

    def _extract_datetime(self, tags: Dict) -> Optional[datetime]:
        """从 EXIF 标签中提取拍摄时间

        Args:
            tags: EXIF 标签字典

        Returns:
            拍摄时间，如果无法解析则返回 None
        """
        for tag_name in self.DATETIME_TAGS:
            if tag_name in tags:
                try:
                    datetime_str = str(tags[tag_name])
                    return datetime.strptime(datetime_str, '%Y:%m:%d %H:%M:%S')
                except ValueError as e:
                    logger.warning(f"无法解析时间标签 {tag_name}: {datetime_str}, 错误: {e}")
                    continue

        logger.debug(f"未找到有效的拍摄时间标签")
        return None
